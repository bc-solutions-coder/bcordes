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
  makeNotification,
  pauseRequest,
  resetBackend,
  secondInquiryId,
} from '../../../../testing/dashboard-backend'
import { DashboardEventSource } from '../../../../testing/dashboard-browser'
import { renderDashboard } from '../../../../testing/render-dashboard'

vi.mock(
  '@tanstack/react-start',
  () => import('../../../../testing/server-functions'),
)
vi.mock(
  '@bcordes/auth/session',
  () => import('../../../../testing/dashboard-backend'),
)
vi.mock(
  '@bcordes/auth/sdk',
  () => import('../../../../testing/dashboard-backend'),
)
vi.mock(
  '@bcordes/wallow/client',
  () => import('../../../../testing/dashboard-backend'),
)

beforeEach(() => {
  resetBackend()
  DashboardEventSource.instances = []
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.stubGlobal('BroadcastChannel', undefined)
  vi.stubGlobal('EventSource', DashboardEventSource)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('opens the actual inquiry destination while marking the notification read is still pending', async () => {
  const { router } = await renderDashboard('/dashboard/inquiries', {
    bell: true,
  })
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Notifications' }),
    ).toHaveTextContent('1'),
  )
  const pending = pauseRequest(
    'POST',
    `/v1/notifications/${firstInquiryId}/read`,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
  fireEvent.click(
    await within(await screen.findByRole('dialog')).findByRole('button', {
      name: /Website inquiry/,
    }),
  )
  try {
    expect(
      await screen.findByRole('heading', { name: 'Inquiry Details' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(
      `/dashboard/inquiries/${firstInquiryId}`,
    )
    expect(backend.notifications[0].isRead).toBe(false)
    expect(
      screen.getByRole('button', { name: 'Notifications' }),
    ).toHaveTextContent('1')
  } finally {
    await act(() => pending.resolve(undefined))
  }
})

async function openBell() {
  const trigger = screen.getByRole('button', { name: 'Notifications' })
  if (trigger.getAttribute('aria-expanded') !== 'true') fireEvent.click(trigger)
  return within(await screen.findByRole('dialog'))
}

it('handles a failed read after navigation, retains unread state, and persists a later retry', async () => {
  const { router, queryClient } = await renderDashboard(
    '/dashboard/inquiries',
    { bell: true },
  )
  await waitFor(() => expect(queryClient.isFetching()).toBe(0))
  const pending = pauseRequest(
    'POST',
    `/v1/notifications/${firstInquiryId}/read`,
  )
  const bell = await openBell()
  fireEvent.click(await bell.findByRole('button', { name: /Website inquiry/ }))
  expect(
    await screen.findByRole('heading', { name: 'Inquiry Details' }),
  ).toBeVisible()
  await act(() =>
    pending.resolve(
      Response.json(
        { status: 503, code: 'unavailable', title: 'Unavailable' },
        { status: 503 },
      ),
    ),
  )
  expect(
    await screen.findByText('Failed to mark notification as read'),
  ).toBeVisible()
  expect(router.state.location.pathname).toBe(
    `/dashboard/inquiries/${firstInquiryId}`,
  )
  expect(backend.notifications[0].isRead).toBe(false)
  expect(
    screen.getByRole('button', { name: 'Notifications' }),
  ).toHaveTextContent('1')
  backend.intercept = undefined
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
  fireEvent.click(
    await (await openBell()).findByRole('button', { name: /Website inquiry/ }),
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Notifications' }),
    ).toHaveTextContent(/^$/),
  )
  expect(backend.notifications[0].isRead).toBe(true)
  expect(
    backend.requests
      .filter((request) => request.method === 'POST')
      .map((request) => new URL(request.url).pathname),
  ).toEqual([
    `/v1/notifications/${firstInquiryId}/read`,
    `/v1/notifications/${firstInquiryId}/read`,
  ])
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })
  const reopened = await openBell()
  expect(
    reopened.queryByRole('button', { name: 'Mark all as read' }),
  ).not.toBeInTheDocument()
  fireEvent.click(
    await reopened.findByRole('button', { name: /Website inquiry/ }),
  )
  expect(
    backend.requests.filter((request) => request.method === 'POST'),
  ).toHaveLength(2)
})

it('opens an already-read notification without sending a write', async () => {
  backend.notifications = [makeNotification({ isRead: true })]
  backend.unreadCount = 0
  const { router } = await renderDashboard('/dashboard/inquiries', {
    bell: true,
  })
  fireEvent.click(
    await (await openBell()).findByRole('button', { name: /Website inquiry/ }),
  )
  expect(
    await screen.findByRole('heading', { name: 'Inquiry Details' }),
  ).toBeVisible()
  expect(router.state.location.pathname).toBe(
    `/dashboard/inquiries/${firstInquiryId}`,
  )
  expect(
    backend.requests.filter((request) => request.method !== 'GET'),
  ).toHaveLength(0)
})

it('does not show a notification button to a signed-out visitor', async () => {
  backend.signedIn = false
  await renderDashboard('/dashboard/inquiries', { bell: true })
  expect(
    screen.queryByRole('button', { name: 'Notifications' }),
  ).not.toBeInTheDocument()
})

it.each([5, 120])(
  'shows the account unread count %s, capped at 99+',
  async (count) => {
    backend.unreadCount = count
    await renderDashboard('/dashboard/inquiries', { bell: true })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Notifications' }),
      ).toHaveTextContent(count === 120 ? '99+' : '5'),
    )
    expect(screen.queryByText('120')).not.toBeInTheDocument()
  },
)

it('removes a previously visible badge when the authoritative count becomes zero', async () => {
  const { queryClient } = await renderDashboard('/dashboard/inquiries', {
    bell: true,
  })
  const trigger = screen.getByRole('button', { name: 'Notifications' })
  await waitFor(() => expect(trigger).toHaveTextContent('1'))
  backend.unreadCount = 0
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })
  await waitFor(() => expect(trigger).toHaveTextContent(/^$/))
  expect(trigger).toBeVisible()
})

it('shows the empty popover for an empty returned list', async () => {
  backend.notifications = []
  backend.unreadCount = 0
  await renderDashboard('/dashboard/inquiries', { bell: true })
  expect(await (await openBell()).findByText('No notifications')).toBeVisible()
})

it('shows only the first five returned notifications with their own messages and relative times', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-01-15T11:00:00Z'))
  backend.notifications = [
    makeNotification({
      title: 'Recent inquiry',
      message: 'Recent body',
      createdAt: '2026-01-15T10:59:40Z',
    }),
    makeNotification({
      id: secondInquiryId,
      title: 'Older inquiry',
      message: 'Older body',
      createdAt: '2026-01-15T10:30:00Z',
    }),
    ...[3, 4, 5, 6].map((number) =>
      makeNotification({
        id: String(number),
        title: `Message ${number}`,
        message: `Body ${number}`,
      }),
    ),
  ]
  try {
    await renderDashboard('/dashboard/inquiries', { bell: true })
    const bell = await openBell()
    const recent = await bell.findByRole('button', { name: /Recent inquiry/ })
    expect(recent).toHaveTextContent('Recent body')
    expect(recent).toHaveTextContent('just now')
    const older = bell.getByRole('button', { name: /Older inquiry/ })
    expect(older).toHaveTextContent('Older body')
    expect(older).toHaveTextContent('30m ago')
    for (const number of [3, 4, 5])
      expect(
        bell.getByRole('button', { name: new RegExp(`Message ${number}`) }),
      ).toHaveTextContent(`Body ${number}`)
    expect(bell.queryByText('Message 6')).not.toBeInTheDocument()
  } finally {
    vi.useRealTimers()
  }
})

it('disables mark-all while pending and refreshes the list and badge after success', async () => {
  await renderDashboard('/dashboard/inquiries', { bell: true })
  const bell = await openBell()
  const button = await bell.findByRole('button', { name: 'Mark all as read' })
  const pending = pauseRequest('POST', '/v1/notifications/read-all')
  fireEvent.click(button)
  await waitFor(() => expect(button).toBeDisabled())
  fireEvent.click(button)
  await waitFor(() =>
    expect(
      backend.requests.filter((request) => request.method === 'POST'),
    ).toHaveLength(1),
  )
  await act(() => pending.resolve(undefined))
  expect(
    await screen.findByText('All notifications marked as read'),
  ).toBeVisible()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Notifications' }),
    ).toHaveTextContent(/^$/),
  )
  expect(
    bell.queryByRole('button', { name: 'Mark all as read' }),
  ).not.toBeInTheDocument()
  expect(backend.notifications[0].isRead).toBe(true)
})

it('shows mark-all rejection without claiming success and leaves the action usable', async () => {
  await renderDashboard('/dashboard/inquiries', { bell: true })
  const bell = await openBell()
  const button = await bell.findByRole('button', { name: 'Mark all as read' })
  const pending = pauseRequest('POST', '/v1/notifications/read-all')
  fireEvent.click(button)
  await act(() =>
    pending.resolve(
      Response.json(
        {
          status: 409,
          code: 'read_conflict',
          title: 'Conflict',
          detail: 'Could not mark all read',
        },
        { status: 409 },
      ),
    ),
  )
  expect(await screen.findByText('Could not mark all read')).toBeVisible()
  expect(
    screen.queryByText('All notifications marked as read'),
  ).not.toBeInTheDocument()
  expect(button).toBeEnabled()
  expect(
    screen.getByRole('button', { name: 'Notifications' }),
  ).toHaveTextContent('1')
  expect(backend.notifications[0].isRead).toBe(false)
})

it.each([false, true])(
  'bumps the badge for a delivered event before reconciling authoritative data (uncached=%s)',
  async (uncached) => {
    backend.unreadCount = 3
    const initialPending = uncached
      ? pauseRequest('GET', '/v1/notifications/unread-count')
      : undefined
    const { queryClient } = await renderDashboard('/dashboard/inquiries', {
      bell: true,
    })
    if (!uncached) await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    const pending =
      initialPending ?? pauseRequest('GET', '/v1/notifications/unread-count')
    backend.unreadCount = 7
    backend.notifications = [
      makeNotification({ title: 'Authoritative message' }),
    ]
    act(() =>
      DashboardEventSource.instances[0].dispatchEvent(
        new MessageEvent('NotificationCreated', {
          data: JSON.stringify({
            type: 'NotificationCreated',
            module: 'Notifications',
            payload: { title: 'A new notification' },
          }),
        }),
      ),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Notifications' }),
      ).toHaveTextContent(uncached ? '1' : '4'),
    )
    await act(() => pending.resolve(undefined))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Notifications' }),
      ).toHaveTextContent('7'),
    )
    expect(
      await (await openBell()).findByText('Authoritative message'),
    ).toBeVisible()
    expect(screen.queryByText('Website inquiry')).not.toBeInTheDocument()
  },
)

it.each([
  {
    visibility: 'visible',
    payload: { title: 'Lowercase event title' },
    title: 'Lowercase event title',
    visible: true,
  },
  {
    visibility: 'visible',
    payload: { Title: 'Uppercase event title' },
    title: 'Uppercase event title',
    visible: true,
  },
  {
    visibility: 'visible',
    payload: null,
    title: 'New notification',
    visible: true,
  },
  {
    visibility: 'hidden',
    payload: { title: 'Hidden event title' },
    title: 'Hidden event title',
    visible: false,
  },
])(
  'shows event feedback $title only when the tab is visible',
  async ({ visibility, payload, title, visible }) => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(
      visibility === 'hidden' ? 'hidden' : 'visible',
    )
    const { queryClient } = await renderDashboard('/dashboard/inquiries', {
      bell: true,
    })
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    act(() =>
      DashboardEventSource.instances[0].dispatchEvent(
        new MessageEvent('NotificationCreated', {
          data: JSON.stringify({
            type: 'NotificationCreated',
            module: 'Notifications',
            payload,
          }),
        }),
      ),
    )
    if (visible) expect(await screen.findByText(title)).toBeVisible()
    else {
      await waitFor(() => expect(queryClient.isFetching()).toBe(0))
      expect(screen.queryByText(title)).not.toBeInTheDocument()
    }
  },
)

it('opens the full notification page through View all notifications', async () => {
  const { router } = await renderDashboard('/dashboard/inquiries', {
    bell: true,
  })
  const link = (await openBell()).getByRole('link', {
    name: 'View all notifications',
  })
  expect(link).toHaveAttribute('href', '/dashboard/notifications')
  fireEvent.click(link)
  expect(
    await screen.findByRole('heading', { name: 'Notifications', level: 1 }),
  ).toBeVisible()
  expect(router.state.location.pathname).toBe('/dashboard/notifications')
  expect(screen.getByText('Showing 1 of 1 loaded notifications')).toBeVisible()
})
