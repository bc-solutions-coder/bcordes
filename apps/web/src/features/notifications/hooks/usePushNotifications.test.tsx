import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  deregisterPushDevice,
  fetchVapidPublicKey,
  listPushDevices,
  registerPushDevice,
  sendTestPush,
} from '../server-fns/notifications'
import { usePushNotifications } from './usePushNotifications'
import type { ReactNode } from 'react'
import type { PushDevice } from '@bcordes/wallow/types'

vi.mock('../server-fns/notifications', () => ({
  listPushDevices: vi.fn(),
  fetchVapidPublicKey: vi.fn(),
  registerPushDevice: vi.fn(),
  deregisterPushDevice: vi.fn(),
  sendTestPush: vi.fn(),
}))
const device = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  platform: 'web',
  createdAt: '2026-01-01T00:00:00Z',
}
const unavailable =
  'Browser push is awaiting the Wallow delivery and device authorization update.'
const workerDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'serviceWorker',
)
const pushDescriptor = Object.getOwnPropertyDescriptor(window, 'PushManager')
const subscription = {
  toJSON: () => ({
    endpoint: 'https://push.example/subscription',
    keys: { p256dh: 'public-key', auth: 'auth-key' },
  }),
}
const subscribe = vi.fn(() => Promise.resolve(subscription))
const registration = { pushManager: { subscribe } }
const register = vi.fn(() => Promise.resolve(registration))
let devices: Array<PushDevice> = []

beforeEach(() => {
  vi.resetAllMocks()
  devices = []
  vi.mocked(listPushDevices).mockImplementation(() => Promise.resolve(devices))
  vi.mocked(fetchVapidPublicKey).mockResolvedValue('_wAB-g')
  vi.mocked(registerPushDevice).mockImplementation(() => {
    devices = [device]
    return Promise.resolve(device)
  })
  vi.mocked(deregisterPushDevice).mockImplementation(() => {
    devices = []
    return Promise.resolve()
  })
  vi.mocked(sendTestPush).mockResolvedValue(undefined)
  subscribe.mockResolvedValue(subscription)
  register.mockResolvedValue(registration)
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register, ready: Promise.resolve(registration) },
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission: 'default' })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (workerDescriptor)
    Object.defineProperty(navigator, 'serviceWorker', workerDescriptor)
  else Reflect.deleteProperty(navigator, 'serviceWorker')
  if (pushDescriptor)
    Object.defineProperty(window, 'PushManager', pushDescriptor)
  else Reflect.deleteProperty(window, 'PushManager')
})
function renderPush(cached?: Array<PushDevice>) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  })
  if (cached) client.setQueryData(['push-devices'], cached)
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return {
    client,
    ...renderHook(() => usePushNotifications(), { wrapper: Wrapper }),
  }
}

it('supports browser push when both worker and PushManager APIs exist', () => {
  const { result } = renderPush()
  expect(result.current.isSupported).toBe(true)
})
it.each(['serviceWorker', 'PushManager'])(
  'does not support push when %s is missing',
  (missing) => {
    Reflect.deleteProperty(
      missing === 'serviceWorker' ? navigator : window,
      missing,
    )
    const { result } = renderPush()
    expect(result.current.isSupported).toBe(false)
    expect(listPushDevices).not.toHaveBeenCalled()
  },
)
it('reports registered when the controlled server returns a device', async () => {
  devices = [device]
  const { result } = renderPush()
  await waitFor(() => expect(result.current.isRegistered).toBe(true))
})
it('clears cached registration when the completed device query returns no devices', async () => {
  const { result, client } = renderPush([device])
  expect(result.current.isRegistered).toBe(true)
  await waitFor(() => expect(client.isFetching()).toBe(0))
  await waitFor(() => expect(result.current.isRegistered).toBe(false))
})
it('passes decoded key bytes and subscription credentials to controlled operations, then reflects registration and permission', async () => {
  subscribe.mockImplementation(() => {
    vi.stubGlobal('Notification', { permission: 'granted' })
    return Promise.resolve(subscription)
  })
  const { result } = renderPush()
  await act(async () => {
    await result.current.enable()
  })
  expect(register).toHaveBeenCalledWith('/sw.js')
  expect(subscribe).toHaveBeenCalledWith({
    userVisibleOnly: true,
    applicationServerKey: new Uint8Array([255, 0, 1, 250]),
  })
  expect(registerPushDevice).toHaveBeenCalledWith({
    data: {
      endpoint: 'https://push.example/subscription',
      p256dh: 'public-key',
      auth: 'auth-key',
    },
  })
  await waitFor(() => expect(result.current.isRegistered).toBe(true))
  expect(result.current.permission).toBe('granted')
})
it('deregisters the first returned device and reflects the refreshed empty collection', async () => {
  devices = [device]
  const { result } = renderPush()
  await waitFor(() => expect(result.current.isRegistered).toBe(true))
  await act(async () => {
    await result.current.disable()
  })
  expect(deregisterPushDevice).toHaveBeenCalledWith({ data: { id: device.id } })
  await waitFor(() => expect(result.current.isRegistered).toBe(false))
})
it('does not deregister anything when there are no push devices', async () => {
  const { result } = renderPush()
  await act(async () => {
    await result.current.disable()
  })
  expect(result.current.isRegistered).toBe(false)
  expect(deregisterPushDevice).not.toHaveBeenCalled()
})
it('reports default permission when the browser has no Notification API', () => {
  Reflect.deleteProperty(window, 'Notification')
  Reflect.deleteProperty(navigator, 'serviceWorker')
  const { result } = renderPush()
  expect(result.current.permission).toBe('default')
  expect(result.current.isSupported).toBe(false)
  expect(listPushDevices).not.toHaveBeenCalled()
})
it('refreshes registration after the controlled test-send operation completes', async () => {
  devices = [device]
  vi.mocked(sendTestPush).mockImplementation(() => {
    devices = []
    return Promise.resolve()
  })
  const { result } = renderPush()
  await waitFor(() => expect(result.current.isRegistered).toBe(true))
  await act(async () => {
    await result.current.sendTest()
  })
  expect(sendTestPush).toHaveBeenCalledOnce()
  await waitFor(() => expect(result.current.isRegistered).toBe(false))
})
it.each(['Key request failed', unavailable])(
  'propagates enable failure %s without starting registration',
  async (message) => {
    const failure = new Error(message)
    vi.mocked(fetchVapidPublicKey).mockRejectedValue(failure)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderPush()
    await act(async () => {
      await expect(result.current.enable()).rejects.toBe(failure)
    })
    expect(result.current.isRegistered).toBe(false)
    expect(register).not.toHaveBeenCalled()
    expect(subscribe).not.toHaveBeenCalled()
    expect(registerPushDevice).not.toHaveBeenCalled()
  },
)
it('propagates deregistration failure and preserves registered state', async () => {
  devices = [device]
  const failure = new Error('Deregistration failed')
  vi.mocked(deregisterPushDevice).mockRejectedValue(failure)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { result } = renderPush()
  await waitFor(() => expect(result.current.isRegistered).toBe(true))
  await act(async () => {
    await expect(result.current.disable()).rejects.toBe(failure)
  })
  expect(result.current.isRegistered).toBe(true)
})
it.each(['Test request failed', unavailable])(
  'propagates test-send failure %s and preserves registered state',
  async (message) => {
    devices = [device]
    const failure = new Error(message)
    vi.mocked(sendTestPush).mockRejectedValue(failure)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderPush()
    await waitFor(() => expect(result.current.isRegistered).toBe(true))
    await act(async () => {
      await expect(result.current.sendTest()).rejects.toBe(failure)
    })
    expect(result.current.isRegistered).toBe(true)
  },
)
