import { useState } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import {
  backend,
  firstInquiryId,
  pauseRequest,
  resetBackend,
} from '../../../testing/dashboard-backend'
import { renderDashboard } from '../../../testing/render-dashboard'
import * as notifications from '@/features/notifications'

vi.mock(
  '@tanstack/react-start',
  () => import('../../../testing/server-functions'),
)
vi.mock(
  '@bcordes/auth/session',
  () => import('../../../testing/dashboard-backend'),
)
vi.mock('@bcordes/auth/sdk', () => import('../../../testing/dashboard-backend'))
vi.mock(
  '@bcordes/wallow/client',
  () => import('../../../testing/dashboard-backend'),
)

const path = '/dashboard/settings'
const device = {
  id: firstInquiryId,
  platform: 'Browser',
  createdAt: '2026-01-01T00:00:00Z',
}
const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'serviceWorker',
)
const register = vi.fn()

beforeEach(() => {
  resetBackend()
  register.mockReset()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.stubGlobal('BroadcastChannel', undefined)
  vi.stubGlobal(
    'EventSource',
    class extends EventTarget {
      close() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  if (serviceWorkerDescriptor)
    Object.defineProperty(navigator, 'serviceWorker', serviceWorkerDescriptor)
  else Reflect.deleteProperty(navigator, 'serviceWorker')
})

function channel(name: string) {
  const description = screen.getByText(name, { selector: 'p', exact: true })
  const row = description.parentElement?.parentElement?.parentElement
  if (!row) throw new Error(`Missing channel row: ${name}`)
  return within(row)
}
function switchFor(name: string) {
  return channel(name).getByRole('switch')
}
function supportPush(permission: NotificationPermission = 'granted') {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission })
}
function controlSuccessfulPush(initialRegistered: boolean) {
  vi.spyOn(notifications, 'usePushNotifications').mockImplementation(
    function useControlledPush() {
      const [isRegistered, setRegistered] = useState(initialRegistered)
      return {
        isSupported: true,
        permission: 'granted',
        isRegistered,
        enable: () => {
          setRegistered(true)
          return Promise.resolve(device)
        },
        disable: () => {
          setRegistered(false)
          return Promise.resolve()
        },
        sendTest: () => Promise.resolve(),
      }
    },
  )
}

it('loads the saved preferences into all four channel controls', async () => {
  await renderDashboard(path)
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
  expect(
    screen.getByText('Choose how you want to receive notifications'),
  ).toBeVisible()
  for (const [name, description, checked] of [
    ['Email', 'Receive notifications via email', true],
    ['SMS', 'Receive notifications via text message', false],
    ['Push', 'Receive push notifications in your browser', false],
    ['In-App', 'Receive notifications within the application', true],
  ] as const) {
    expect(channel(name).getByText(description)).toBeVisible()
    expect(switchFor(name)).toHaveAttribute('aria-checked', String(checked))
  }
  expect(screen.getAllByRole('switch')).toHaveLength(4)
})

it.each([false, true])(
  'optimistically changes SMS from %s and persists only that channel',
  async (initial) => {
    backend.settings[1].isEnabled = initial
    const { queryClient } = await renderDashboard(path)
    const pending = pauseRequest('PUT', '/v1/notification-settings/channel')
    fireEvent.click(switchFor('SMS'))
    expect(switchFor('SMS')).toHaveAttribute('aria-checked', String(!initial))
    expect(switchFor('Email')).toBeChecked()
    expect(switchFor('In-App')).toBeChecked()
    expect(switchFor('Push')).not.toBeChecked()
    expect(backend.settings[1].isEnabled).toBe(initial)
    await waitFor(() =>
      expect(
        backend.requests.filter((request) => request.method === 'PUT'),
      ).toHaveLength(1),
    )
    const write = backend.requests.find((request) => request.method === 'PUT')!
    expect(new URL(write.url).pathname).toBe(
      '/v1/notification-settings/channel',
    )
    expect(await write.json()).toEqual({ channelType: 1, isEnabled: !initial })
    await act(() => pending.resolve(undefined))
    await waitFor(() =>
      expect(queryClient.getQueryData(['notification-settings'])).toEqual(
        expect.arrayContaining([{ channelType: 1, isEnabled: !initial }]),
      ),
    )
    expect(backend.settings).toEqual(
      expect.arrayContaining([
        { channelType: 0, isEnabled: true },
        { channelType: 2, isEnabled: true },
        { channelType: 1, isEnabled: !initial },
      ]),
    )
    expect(switchFor('SMS')).toHaveAttribute('aria-checked', String(!initial))
  },
)

it('creates and persists a previously unsaved Email preference without changing other channels', async () => {
  backend.settings = [
    { channelType: 1, isEnabled: false },
    { channelType: 2, isEnabled: true },
  ]
  const { queryClient } = await renderDashboard(path)
  const pending = pauseRequest('PUT', '/v1/notification-settings/channel')
  expect(switchFor('Email')).not.toBeChecked()
  fireEvent.click(switchFor('Email'))
  expect(switchFor('Email')).toBeChecked()
  expect(backend.settings).toHaveLength(2)
  await act(() => pending.resolve(undefined))
  await waitFor(() =>
    expect(queryClient.getQueryData(['notification-settings'])).toEqual([
      { channelType: 1, isEnabled: false },
      { channelType: 2, isEnabled: true },
      { channelType: 0, isEnabled: true },
    ]),
  )
  const write = backend.requests.find((request) => request.method === 'PUT')!
  expect(await write.json()).toEqual({ channelType: 0, isEnabled: true })
  expect(switchFor('SMS')).not.toBeChecked()
  expect(switchFor('In-App')).toBeChecked()
})

it('rolls back an optimistic preference after rejection and shows the failure', async () => {
  await renderDashboard(path)
  const pending = pauseRequest('PUT', '/v1/notification-settings/channel')
  fireEvent.click(switchFor('SMS'))
  expect(switchFor('SMS')).toBeChecked()
  await act(() =>
    pending.resolve(
      Response.json(
        {
          status: 409,
          code: 'settings_conflict',
          title: 'Conflict',
          detail: 'Preference could not be saved',
        },
        { status: 409 },
      ),
    ),
  )
  expect(await screen.findByText('Preference could not be saved')).toBeVisible()
  expect(switchFor('SMS')).not.toBeChecked()
  expect(switchFor('Email')).toBeChecked()
  expect(switchFor('In-App')).toBeChecked()
  expect(backend.settings[1].isEnabled).toBe(false)
})

it('shows generic failure feedback when the update operation rejects with a non-Error value', async () => {
  await renderDashboard(path)
  const update = vi
    .spyOn(notifications, 'updateChannelSetting')
    .mockRejectedValue('connection failed')
  fireEvent.click(switchFor('SMS'))
  await waitFor(() => expect(update).toHaveBeenCalled())
  expect(
    await screen.findByText(
      'Something went wrong on our side. Please try again later.',
    ),
  ).toBeVisible()
  expect(switchFor('SMS')).not.toBeChecked()
})

it.each([
  {
    supported: false,
    permission: 'default',
  },
  {
    supported: true,
    permission: 'denied',
  },
] as const)(
  'prevents push registration when supported=$supported and permission=$permission',
  async ({ supported, permission }) => {
    if (supported) supportPush(permission)
    await renderDashboard(path)
    const control = switchFor('Push')
    expect(control).toHaveAttribute('aria-disabled', 'true')
    expect(register).not.toHaveBeenCalled()
    expect(
      backend.requests.filter((request) => request.method !== 'GET'),
    ).toHaveLength(0)
    fireEvent.click(control)
    expect(control).not.toBeChecked()
    expect(register).not.toHaveBeenCalled()
  },
)

it.each([false, true])(
  'shows the test notification action only when the controlled hook reports registered=%s',
  async (registered) => {
    controlSuccessfulPush(registered)
    await renderDashboard(path)
    expect(
      screen.queryByRole('button', { name: 'Send test notification' }) !== null,
    ).toBe(registered)
    expect(switchFor('Push')).toHaveAttribute(
      'aria-checked',
      String(registered),
    )
  },
)

it.each([false, true])(
  'shows the resulting state and success feedback after a controlled push toggle from %s',
  async (registered) => {
    controlSuccessfulPush(registered)
    await renderDashboard(path)
    fireEvent.click(switchFor('Push'))
    expect(
      await screen.findByText(
        registered
          ? 'Push notifications disabled'
          : 'Push notifications enabled',
      ),
    ).toBeVisible()
    expect(switchFor('Push')).toHaveAttribute(
      'aria-checked',
      String(!registered),
    )
    expect(
      screen.queryByRole('button', { name: 'Send test notification' }) !== null,
    ).toBe(!registered)
  },
)

it('shows success after the controlled public hook completes a test notification', async () => {
  controlSuccessfulPush(true)
  await renderDashboard(path)
  fireEvent.click(
    screen.getByRole('button', { name: 'Send test notification' }),
  )
  expect(await screen.findByText('Test notification sent')).toBeVisible()
})

it('shows the current authenticated push-enable failure without registering a device or claiming success', async () => {
  supportPush()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await renderDashboard(path)
  await waitFor(() =>
    expect(switchFor('Push')).not.toHaveAttribute('aria-disabled', 'true'),
  )
  fireEvent.click(switchFor('Push'))
  expect(
    await screen.findByText('Failed to update push notifications'),
  ).toBeVisible()
  expect(
    screen.queryByText('Push notifications enabled'),
  ).not.toBeInTheDocument()
  expect(switchFor('Push')).not.toBeChecked()
  expect(register).not.toHaveBeenCalled()
  expect(
    backend.requests.filter((request) => request.method !== 'GET'),
  ).toHaveLength(0)
})

it('shows the current authenticated test-delivery failure for a cached device without claiming success', async () => {
  supportPush()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await renderDashboard(path, (client) =>
    client.setQueryData(['push-devices'], [device]),
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Send test notification' }),
  )
  expect(
    await screen.findByText('Failed to send test notification'),
  ).toBeVisible()
  expect(screen.queryByText('Test notification sent')).not.toBeInTheDocument()
  expect(
    backend.requests.filter((request) => request.method !== 'GET'),
  ).toHaveLength(0)
})

it('redirects signed-out visitors with the settings return destination before loading preferences', async () => {
  backend.signedIn = false
  const { router } = await renderDashboard(path)
  expect(router.state.location.href).toBe(
    '/bff/login?returnTo=%2Fdashboard%2Fsettings',
  )
  expect(backend.requests).toHaveLength(0)
  expect(
    screen.queryByRole('heading', { name: 'Settings' }),
  ).not.toBeInTheDocument()
})
