import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  backend,
  firstInquiryId,
  makeNotification,
  pauseRequest,
  resetBackend,
  secondInquiryId,
} from '../../../testing/dashboard-backend'
import { DashboardEventSource } from '../../../testing/dashboard-browser'
import { renderDashboard } from '../../../testing/render-dashboard'

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

it('shows all 20 returned notifications with an explicit loaded-list limit and no inactive continuation', async () => {
  backend.notifications = Array.from({ length: 20 }, (_, index) =>
    makeNotification({
      id: `550e8400-e29b-41d4-a716-${String(index).padStart(12, '0')}`,
      title: `Loaded message ${index + 1}`,
    }),
  )
  await renderDashboard('/dashboard/notifications')
  expect(
    screen.getByText(
      'Showing up to 20 notifications. Filters apply to this list.',
    ),
  ).toBeVisible()
  expect(
    screen.getByText('Showing 20 of 20 loaded notifications'),
  ).toBeVisible()
  expect(
    screen
      .getAllByText(/^Loaded message /)
      .map((element) => element.textContent),
  ).toEqual(
    Array.from({ length: 20 }, (_, index) => `Loaded message ${index + 1}`),
  )
  expect(
    screen.queryByRole('button', { name: 'Load more' }),
  ).not.toBeInTheDocument()
})

const typeLabels = [
  ['TaskAssigned', 'Tasks'],
  ['InquirySubmitted', 'Inquiries'],
  ['InquiryComment', 'Inquiry Replies'],
  ['SystemAlert', 'Alerts'],
  ['Announcement', 'Announcements'],
  ['BillingInvoice', 'Billing'],
  ['Mention', 'Mentions'],
] as const

it.each(typeLabels)(
  'filters the loaded list to %s and restores it when %s is cleared',
  async (type, label) => {
    backend.notifications = typeLabels.map(([kind], index) =>
      makeNotification({
        id: `550e8400-e29b-41d4-a716-${String(index).padStart(12, '0')}`,
        type: kind,
        title: `${kind} message`,
      }),
    )
    const { queryClient } = await renderDashboard('/dashboard/notifications')
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    const initialRequests = backend.requests.length
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(screen.getByText(`${type} message`)).toBeVisible()
    expect(screen.getAllByText(/ message$/)).toHaveLength(1)
    expect(
      screen.getByText('Showing 1 of 7 loaded notifications'),
    ).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(screen.getAllByText(/ message$/)).toHaveLength(7)
    expect(
      screen.getByText('Showing 7 of 7 loaded notifications'),
    ).toBeVisible()
    expect(backend.requests).toHaveLength(initialRequests)
  },
)

it('preserves returned order in a short batch and combines unread and type filters', async () => {
  backend.notifications = [
    makeNotification({
      id: firstInquiryId,
      title: 'Older inquiry',
      createdAt: '2026-01-01T00:00:00Z',
    }),
    makeNotification({
      id: secondInquiryId,
      title: 'Newest alert',
      type: 'SystemAlert',
      createdAt: '2026-02-01T00:00:00Z',
    }),
    makeNotification({
      id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Read inquiry',
      isRead: true,
      createdAt: '2026-01-15T00:00:00Z',
    }),
  ]
  await renderDashboard('/dashboard/notifications')
  expect(
    screen
      .getAllByRole('checkbox')
      .slice(1)
      .map((element) => element.getAttribute('aria-label')),
  ).toEqual([
    'Select notification: Older inquiry',
    'Select notification: Newest alert',
    'Select notification: Read inquiry',
  ])
  expect(screen.getByText('Showing 3 of 3 loaded notifications')).toBeVisible()
  expect(screen.getByText('2 unread')).toBeVisible()
  fireEvent.click(screen.getByRole('tab', { name: 'Unread' }))
  fireEvent.click(screen.getByRole('button', { name: 'Inquiries' }))
  expect(screen.getByText('Older inquiry')).toBeVisible()
  expect(screen.queryByText('Newest alert')).not.toBeInTheDocument()
  expect(screen.queryByText('Read inquiry')).not.toBeInTheDocument()
  expect(screen.getByText('Showing 1 of 3 loaded notifications')).toBeVisible()
  fireEvent.click(screen.getByRole('tab', { name: 'All' }))
  expect(screen.getByText('Read inquiry')).toBeVisible()
  expect(screen.getByText('Showing 2 of 3 loaded notifications')).toBeVisible()
})

it('keeps the loaded-list limit and truthful counts visible for an empty response', async () => {
  backend.notifications = []
  await renderDashboard('/dashboard/notifications')
  expect(
    screen.getByRole('heading', { name: 'No notifications in this list.' }),
  ).toBeVisible()
  expect(
    screen.getByText(
      'Showing up to 20 notifications. Filters apply to this list.',
    ),
  ).toBeVisible()
  expect(screen.getByText('Showing 0 of 0 loaded notifications')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Load more' }),
  ).not.toBeInTheDocument()
})

it.each(['unread', 'type'])(
  'scopes a zero-match %s filter to the loaded list and restores results when cleared',
  async (filter) => {
    backend.notifications = [makeNotification({ isRead: true })]
    await renderDashboard('/dashboard/notifications')
    const control =
      filter === 'unread'
        ? screen.getByRole('tab', { name: 'Unread' })
        : screen.getByRole('button', { name: 'Alerts' })
    fireEvent.click(control)
    expect(
      screen.getByRole('heading', {
        name: 'No notifications match these filters in the loaded list.',
      }),
    ).toBeVisible()
    expect(
      screen.getByText('Showing 0 of 1 loaded notifications'),
    ).toBeVisible()
    expect(
      screen.getByText(
        'Showing up to 20 notifications. Filters apply to this list.',
      ),
    ).toBeVisible()
    fireEvent.click(
      filter === 'unread' ? screen.getByRole('tab', { name: 'All' }) : control,
    )
    expect(screen.getByText('Website inquiry')).toBeVisible()
    expect(
      screen.getByText('Showing 1 of 1 loaded notifications'),
    ).toBeVisible()
  },
)

it('selects and deselects individual rows without navigating', async () => {
  backend.notifications = [
    makeNotification(),
    makeNotification({ id: secondInquiryId, title: 'Second inquiry' }),
  ]
  const { router } = await renderDashboard('/dashboard/notifications')
  const first = screen.getByRole('checkbox', {
    name: 'Select notification: Website inquiry',
  })
  const second = screen.getByRole('checkbox', {
    name: 'Select notification: Second inquiry',
  })
  fireEvent.click(first)
  fireEvent.click(second)
  expect(first).toBeChecked()
  expect(second).toBeChecked()
  expect(screen.getByText('2 selected')).toBeVisible()
  fireEvent.click(first)
  expect(first).not.toBeChecked()
  expect(second).toBeChecked()
  expect(screen.getByText('1 selected')).toBeVisible()
  expect(router.state.location.pathname).toBe('/dashboard/notifications')
  expect(
    backend.requests.filter((request) => request.method !== 'GET'),
  ).toHaveLength(0)
})

it('selects only visible notifications and clears the selection', async () => {
  backend.notifications = [
    makeNotification(),
    makeNotification({
      id: secondInquiryId,
      title: 'Second inquiry',
      type: 'SystemAlert',
    }),
  ]
  await renderDashboard('/dashboard/notifications')
  fireEvent.click(screen.getByRole('button', { name: 'Inquiries' }))
  const all = screen.getByRole('checkbox', { name: 'Select all notifications' })
  fireEvent.click(all)
  expect(all).toBeChecked()
  expect(
    screen.getByRole('checkbox', {
      name: 'Select notification: Website inquiry',
    }),
  ).toBeChecked()
  expect(screen.getByText('1 selected')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Inquiries' }))
  expect(
    screen.getByRole('checkbox', {
      name: 'Select notification: Second inquiry',
    }),
  ).not.toBeChecked()
  expect(all).not.toBeChecked()
  fireEvent.click(all)
  expect(screen.getByText('2 selected')).toBeVisible()
  fireEvent.click(all)
  expect(
    screen
      .getAllByRole('checkbox')
      .every((checkbox) => checkbox.getAttribute('aria-checked') === 'false'),
  ).toBe(true)
  expect(screen.getByText('Select all')).toBeVisible()
})

it('marks the whole account read despite a filter and selection, disables repeats, and refreshes the loaded state', async () => {
  backend.notifications = [
    makeNotification(),
    makeNotification({
      id: secondInquiryId,
      title: 'Hidden alert',
      type: 'SystemAlert',
    }),
  ]
  backend.unreadCount = 80
  await renderDashboard('/dashboard/notifications')
  fireEvent.click(screen.getByRole('button', { name: 'Inquiries' }))
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'Select notification: Website inquiry',
    }),
  )
  const pending = pauseRequest('POST', '/v1/notifications/read-all')
  const button = screen.getByRole('button', { name: 'Mark all as read' })
  expect(button).toBeEnabled()
  fireEvent.click(button)
  await waitFor(() => expect(button).toBeDisabled())
  fireEvent.click(button)
  await waitFor(() =>
    expect(
      backend.requests.filter((request) => request.method === 'POST'),
    ).toHaveLength(1),
  )
  const request = backend.requests.find((item) => item.method === 'POST')!
  expect(new URL(request.url).pathname).toBe('/v1/notifications/read-all')
  expect(await request.text()).toBe('')
  await act(() => pending.resolve(undefined))
  expect(
    await screen.findByText('All notifications marked as read'),
  ).toBeVisible()
  await waitFor(() =>
    expect(screen.queryByText('2 unread')).not.toBeInTheDocument(),
  )
  expect(button).toBeDisabled()
  expect(backend.unreadCount).toBe(0)
  expect(
    backend.notifications.every((notification) => notification.isRead),
  ).toBe(true)
  fireEvent.click(screen.getByRole('tab', { name: 'Unread' }))
  expect(
    screen.getByRole('heading', {
      name: 'No notifications match these filters in the loaded list.',
    }),
  ).toBeVisible()
})

it('does not write when every loaded notification is already read', async () => {
  backend.notifications = [makeNotification({ isRead: true })]
  await renderDashboard('/dashboard/notifications')
  const button = screen.getByRole('button', { name: 'Mark all as read' })
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(screen.queryByText(/^\d+ unread$/)).not.toBeInTheDocument()
  expect(
    backend.requests.filter((request) => request.method !== 'GET'),
  ).toHaveLength(0)
})

it('shows mark-all failure without changing read state or reporting success and permits retry', async () => {
  await renderDashboard('/dashboard/notifications')
  const pending = pauseRequest('POST', '/v1/notifications/read-all')
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
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
  expect(screen.getByText('1 unread')).toBeVisible()
  expect(backend.notifications[0].isRead).toBe(false)
  const button = screen.getByRole('button', { name: 'Mark all as read' })
  expect(button).toBeEnabled()
  backend.intercept = undefined
  fireEvent.click(button)
  expect(
    await screen.findByText('All notifications marked as read'),
  ).toBeVisible()
})

it.each([false, true])(
  'opens the inquiry from a row with isRead=%s and writes only for unread items',
  async (isRead) => {
    backend.notifications = [makeNotification({ isRead })]
    const { router } = await renderDashboard('/dashboard/notifications')
    const pending = pauseRequest(
      'POST',
      `/v1/notifications/${firstInquiryId}/read`,
    )
    fireEvent.click(screen.getByRole('button', { name: /Website inquiry/ }))
    expect(
      await screen.findByRole('heading', { name: 'Inquiry Details' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(
      `/dashboard/inquiries/${firstInquiryId}`,
    )
    expect(screen.getByText('A new website')).toBeVisible()
    if (isRead)
      expect(
        backend.requests.filter((request) => request.method !== 'GET'),
      ).toHaveLength(0)
    else {
      await waitFor(() =>
        expect(
          backend.requests.filter((request) => request.method === 'POST'),
        ).toHaveLength(1),
      )
      expect(backend.notifications[0].isRead).toBe(false)
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
    }
  },
)

it('refreshes visible notifications and the loaded unread count after a real stream event', async () => {
  const { queryClient } = await renderDashboard('/dashboard/notifications')
  await waitFor(() => expect(queryClient.isFetching()).toBe(0))
  backend.notifications = [
    makeNotification({ title: 'Updated message', isRead: true }),
  ]
  act(() =>
    DashboardEventSource.instances[0].dispatchEvent(
      new MessageEvent('NotificationCreated', {
        data: JSON.stringify({
          type: 'NotificationCreated',
          module: 'Notifications',
          payload: null,
        }),
      }),
    ),
  )
  expect(await screen.findByText('Updated message')).toBeVisible()
  expect(screen.queryByText('Website inquiry')).not.toBeInTheDocument()
  expect(screen.queryByText('1 unread')).not.toBeInTheDocument()
})

it('redirects signed-out visitors before loading protected notifications', async () => {
  backend.signedIn = false
  const { router } = await renderDashboard('/dashboard/notifications')
  expect(router.state.location.href).toBe(
    '/bff/login?returnTo=%2Fdashboard%2Fnotifications',
  )
  expect(backend.requests).toHaveLength(0)
})

it('shows the router error screen after a failed notification load', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  backend.intercept = (request) =>
    Promise.resolve(
      new URL(request.url).pathname === '/v1/notifications'
        ? Response.json(
            { status: 503, code: 'unavailable', title: 'Unavailable' },
            { status: 503 },
          )
        : undefined,
    )
  await renderDashboard('/dashboard/notifications')
  expect(screen.getByText('Something went wrong!')).toBeVisible()
  expect(screen.queryByText('Website inquiry')).not.toBeInTheDocument()
})
