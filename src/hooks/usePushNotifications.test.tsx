import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/*  Mock server functions                                              */
/* ------------------------------------------------------------------ */

const mockListPushDevices = vi.fn()
const mockFetchVapidPublicKey = vi.fn()
const mockRegisterPushDevice = vi.fn()
const mockDeregisterPushDevice = vi.fn()
const mockSendTestPush = vi.fn()

vi.mock('@/server-fns/notifications', () => ({
  listPushDevices: (...args: Array<unknown>) => mockListPushDevices(...args),
  fetchVapidPublicKey: (...args: Array<unknown>) => mockFetchVapidPublicKey(...args),
  registerPushDevice: (...args: Array<unknown>) => mockRegisterPushDevice(...args),
  deregisterPushDevice: (...args: Array<unknown>) =>
    mockDeregisterPushDevice(...args),
  sendTestPush: (...args: Array<unknown>) => mockSendTestPush(...args),
}))

/* ------------------------------------------------------------------ */
/*  Browser API stubs                                                  */
/* ------------------------------------------------------------------ */

const mockSubscription = {
  endpoint: 'https://push.example.com/sub/abc',
  toJSON: () => ({
    endpoint: 'https://push.example.com/sub/abc',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  }),
}

const mockPushManager = {
  subscribe: vi.fn().mockResolvedValue(mockSubscription),
}

const mockRegistration = {
  pushManager: mockPushManager,
}

function stubBrowserAPIs(options?: {
  omitServiceWorker?: boolean
  omitPushManager?: boolean
}) {
  if (options?.omitServiceWorker) {
    // Create a navigator object without the serviceWorker property
    const { serviceWorker: _, ...rest } = globalThis.navigator as Record<
      string,
      unknown
    >
    vi.stubGlobal('navigator', rest)
  } else {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      serviceWorker: {
        register: vi.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
      },
    })
  }

  if (options?.omitPushManager) {
    // Remove PushManager from window by deleting it
    const w = globalThis.window as Record<string, unknown>
    delete w.PushManager
  } else {
    vi.stubGlobal('PushManager', vi.fn())
  }

  vi.stubGlobal('Notification', { permission: 'default' })
}

/* ------------------------------------------------------------------ */
/*  Wrapper                                                            */
/* ------------------------------------------------------------------ */

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockListPushDevices.mockResolvedValue([])
    mockFetchVapidPublicKey.mockResolvedValue('test-vapid-key-base64url')
    mockRegisterPushDevice.mockResolvedValue({
      id: 'device-1',
      platform: 'web',
      createdAt: '2026-01-01T00:00:00Z',
    })
    mockDeregisterPushDevice.mockResolvedValue(undefined)
    mockSendTestPush.mockResolvedValue(undefined)
  })

  describe('isSupported', () => {
    it('is true when serviceWorker and PushManager exist', async () => {
      stubBrowserAPIs()
      const { usePushNotifications } = await import('./usePushNotifications')
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })
    })

    it('is false when serviceWorker is missing', async () => {
      stubBrowserAPIs({ omitServiceWorker: true })
      const { usePushNotifications } = await import('./usePushNotifications')
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false)
      })
    })

    it('is false when PushManager is missing', async () => {
      stubBrowserAPIs({ omitPushManager: true })
      const { usePushNotifications } = await import('./usePushNotifications')
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false)
      })
    })
  })

  describe('isRegistered', () => {
    it('is true when listPushDevices returns devices', async () => {
      stubBrowserAPIs()
      mockListPushDevices.mockResolvedValue([
        { id: 'device-1', platform: 'web', createdAt: '2026-01-01T00:00:00Z' },
      ])
      const { usePushNotifications } = await import('./usePushNotifications')
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isRegistered).toBe(true)
      })
    })

    it('is false when listPushDevices returns empty array', async () => {
      stubBrowserAPIs()
      mockListPushDevices.mockResolvedValue([])
      const { usePushNotifications } = await import('./usePushNotifications')
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isRegistered).toBe(false)
      })
    })
  })

  describe('enable mutation', () => {
    it('calls fetchVapidPublicKey, registers SW, subscribes, and calls registerPushDevice', async () => {
      stubBrowserAPIs()
      const { usePushNotifications } = await import('./usePushNotifications')
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      await act(async () => {
        await result.current.enable()
      })

      expect(mockFetchVapidPublicKey).toHaveBeenCalledOnce()
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js')
      expect(mockPushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      })
      expect(mockRegisterPushDevice).toHaveBeenCalledWith({
        data: {
          endpoint: 'https://push.example.com/sub/abc',
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
      })
    })
  })

  describe('disable mutation', () => {
    it('calls deregisterPushDevice with the device id', async () => {
      stubBrowserAPIs()
      const devices = [
        { id: 'device-1', platform: 'web', createdAt: '2026-01-01T00:00:00Z' },
      ]
      mockListPushDevices.mockResolvedValue(devices)
      const { usePushNotifications } = await import('./usePushNotifications')
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isRegistered).toBe(true)
      })

      await act(async () => {
        await result.current.disable()
      })

      expect(mockDeregisterPushDevice).toHaveBeenCalledWith({
        data: { id: 'device-1' },
      })
    })
  })

  describe('sendTest mutation', () => {
    it('calls sendTestPush', async () => {
      stubBrowserAPIs()
      const { usePushNotifications } = await import('./usePushNotifications')
      const { result } = renderHook(() => usePushNotifications(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      await act(async () => {
        await result.current.sendTest()
      })

      expect(mockSendTestPush).toHaveBeenCalledOnce()
    })
  })
})
