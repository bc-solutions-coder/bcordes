import { createMockUser } from '@bcordes/auth/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@bcordes/test-utils'
import { NotificationBell } from './NotificationBell'
import type { useUser } from '@/shared/auth'
import type { EventStreamContextValue } from '../hooks/useEventStream'
import type * as BcordesUtils from '@bcordes/utils'
import type { Notification } from '@bcordes/wallow/types'

const mockUseUser = vi.fn<typeof useUser>(() => ({
  user: null,
  isLoading: false,
}))
const mockSubscribe = vi.fn<EventStreamContextValue['subscribe']>(() => vi.fn())
const mockFetchNotifications = vi.fn<() => Promise<Array<Notification>>>(() =>
  Promise.resolve([]),
)
const mockFetchUnreadCount = vi.fn(() => Promise.resolve(0))

vi.mock('@/shared/auth', () => ({
  useUser: () => mockUseUser(),
}))

vi.mock('../hooks/useEventStream', () => ({
  useEventStream: () => ({ subscribe: mockSubscribe }),
}))

vi.mock('../server-fns/notifications', () => ({
  fetchNotifications: () => mockFetchNotifications(),
  fetchUnreadCount: () => mockFetchUnreadCount(),
  markNotificationRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsRead: vi.fn(() => Promise.resolve()),
}))

vi.mock('../lib/query-utils', () => ({
  invalidateNotifications: vi.fn(),
}))

vi.mock('../lib/routing', () => ({
  getNotificationRoute: vi.fn(() => '/dashboard/notifications'),
}))

// Mock time formatting; keep cn real for the UI primitives.
vi.mock('@bcordes/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof BcordesUtils>()),
  formatRelativeTime: vi.fn(() => 'just now'),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('NotificationBell', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUser.mockReturnValue({ user: null, isLoading: false })
    mockFetchNotifications.mockResolvedValue([])
    mockFetchUnreadCount.mockResolvedValue(0)
  })

  it('returns null when useUser returns null user', () => {
    const { container } = renderWithProviders(<NotificationBell />)
    expect(container.innerHTML).toBe('')
  })

  it('renders bell button when user is authenticated', () => {
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    renderWithProviders(<NotificationBell />)
    expect(screen.getByRole('button', { name: /notifications/i })).toBeDefined()
  })

  it('shows badge with unread count when > 0', async () => {
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchUnreadCount.mockResolvedValue(5)

    renderWithProviders(<NotificationBell />)

    const badge = await screen.findByText('5')
    expect(badge).toBeDefined()
  })

  it('caps the visible unread badge at 99+ for larger counts', async () => {
    mockUseUser.mockReturnValue({ user: createMockUser(), isLoading: false })
    mockFetchUnreadCount.mockResolvedValue(120)
    renderWithProviders(<NotificationBell />)
    expect(await screen.findByText('99+')).toBeVisible()
    expect(screen.queryByText('120')).toBeNull()
  })

  it('does not show badge when count is 0', () => {
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchUnreadCount.mockResolvedValue(0)

    renderWithProviders(<NotificationBell />)

    const button = screen.getByRole('button', { name: /notifications/i })
    const badge = button.querySelector('span')
    expect(badge).toBeNull()
  })

  it('shows empty state when popover is opened with no notifications', async () => {
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchNotifications.mockResolvedValue([])
    mockFetchUnreadCount.mockResolvedValue(0)

    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText('No notifications')).toBeDefined()
    expect(screen.queryByText('Mark all as read')).toBeNull()
  })

  it('renders notification items in popover when notifications exist', async () => {
    const notifications: Array<Notification> = [
      {
        id: 'n1',
        userId: '1',
        type: 'inquiry',
        title: 'New Inquiry',
        message: 'Someone sent you a message',
        isRead: false,
        readAt: null,
        actionUrl: null,
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
      },
      {
        id: 'n2',
        userId: '1',
        type: 'inquiry',
        title: 'Old Inquiry',
        message: 'An older message',
        isRead: true,
        readAt: '2026-03-24T10:00:00Z',
        actionUrl: null,
        createdAt: '2026-03-24T10:00:00Z',
        updatedAt: '2026-03-24T10:00:00Z',
      },
    ]
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchNotifications.mockResolvedValue(notifications)
    mockFetchUnreadCount.mockResolvedValue(1)

    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText('New Inquiry')).toBeDefined()
    expect(screen.getByText('Someone sent you a message')).toBeDefined()
    expect(screen.getByText('Old Inquiry')).toBeDefined()
    expect(screen.getByText('An older message')).toBeDefined()
    expect(screen.getAllByText('just now')).toHaveLength(2)
  })

  it('calls markAllRead when "Mark all as read" is clicked', async () => {
    const { markAllNotificationsRead } =
      await import('../server-fns/notifications')
    const notifications: Array<Notification> = [
      {
        id: 'n1',
        userId: '1',
        type: 'inquiry',
        title: 'Unread Notification',
        message: 'Please read me',
        isRead: false,
        readAt: null,
        actionUrl: null,
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
      },
    ]
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchNotifications.mockResolvedValue(notifications)
    mockFetchUnreadCount.mockResolvedValue(1)

    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    const markAllBtn = await screen.findByText('Mark all as read')
    fireEvent.click(markAllBtn)

    await waitFor(() => {
      expect(markAllNotificationsRead).toHaveBeenCalled()
    })
  })

  it('navigates and marks notification read when clicking a notification', async () => {
    const mockNavigate = vi.fn()
    const { useNavigate } = await import('@tanstack/react-router')
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)

    const { markNotificationRead } = await import('../server-fns/notifications')

    const notifications: Array<Notification> = [
      {
        id: 'n1',
        userId: '1',
        type: 'inquiry',
        title: 'Click Me',
        message: 'Clickable notification',
        isRead: false,
        readAt: null,
        actionUrl: null,
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
      },
    ]
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchNotifications.mockResolvedValue(notifications)
    mockFetchUnreadCount.mockResolvedValue(1)

    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    const notificationBtn = await screen.findByText('Click Me')
    fireEvent.click(notificationBtn)

    await waitFor(() => {
      expect(markNotificationRead).toHaveBeenCalledWith({
        data: { id: 'n1' },
      })
    })
    expect(mockNavigate).toHaveBeenCalled()
  })

  it('shows toast.error when markAllRead mutation fails', async () => {
    const { toast } = await import('sonner')
    const { markAllNotificationsRead } =
      await import('../server-fns/notifications')
    vi.mocked(markAllNotificationsRead).mockRejectedValueOnce(
      new Error('Network failure'),
    )

    const notifications: Array<Notification> = [
      {
        id: 'n1',
        userId: '1',
        type: 'inquiry',
        title: 'Unread',
        message: 'msg',
        isRead: false,
        readAt: null,
        actionUrl: null,
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
      },
    ]
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchNotifications.mockResolvedValue(notifications)
    mockFetchUnreadCount.mockResolvedValue(1)

    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
    const markAllBtn = await screen.findByText('Mark all as read')
    fireEvent.click(markAllBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Unable to reach the server. Check your connection and try again.',
      )
    })
  })

  it('subscribes to NotificationCreated and optimistically bumps unread count', async () => {
    const { invalidateNotifications } = await import('../lib/query-utils')
    let capturedCallback: Parameters<
      EventStreamContextValue['subscribe']
    >[1] = () => {}
    mockSubscribe.mockImplementation(
      (
        _event: string,
        cb: Parameters<EventStreamContextValue['subscribe']>[1],
      ) => {
        capturedCallback = cb
        return vi.fn()
      },
    )

    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchUnreadCount.mockResolvedValue(3)

    renderWithProviders(<NotificationBell />)

    await screen.findByText('3')

    capturedCallback({
      type: 'NotificationCreated',
      module: 'notifications',
      timestamp: new Date().toISOString(),
      payload: { title: 'Hello' },
    })

    await waitFor(() => {
      expect(invalidateNotifications).toHaveBeenCalled()
    })
  })

  it('shows toast when NotificationCreated fires and tab is visible', async () => {
    const { toast } = await import('sonner')
    let capturedCallback: Parameters<
      EventStreamContextValue['subscribe']
    >[1] = () => {}
    mockSubscribe.mockImplementation(
      (
        _event: string,
        cb: Parameters<EventStreamContextValue['subscribe']>[1],
      ) => {
        capturedCallback = cb
        return vi.fn()
      },
    )

    const visibilitySpy = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('visible')

    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchUnreadCount.mockResolvedValue(0)

    renderWithProviders(<NotificationBell />)

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith(
        'NotificationCreated',
        expect.any(Function),
      )
    })

    capturedCallback({
      type: 'NotificationCreated',
      module: 'notifications',
      timestamp: new Date().toISOString(),
      payload: { title: 'New message arrived' },
    })

    expect(toast).toHaveBeenCalledWith('New message arrived')

    visibilitySpy.mockRestore()
  })

  it('shows default toast text when notification has no title', async () => {
    const { toast } = await import('sonner')
    let capturedCallback: Parameters<
      EventStreamContextValue['subscribe']
    >[1] = () => {}
    mockSubscribe.mockImplementation(
      (
        _event: string,
        cb: Parameters<EventStreamContextValue['subscribe']>[1],
      ) => {
        capturedCallback = cb
        return vi.fn()
      },
    )

    const visibilitySpy = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('visible')

    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchUnreadCount.mockResolvedValue(0)

    renderWithProviders(<NotificationBell />)

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled()
    })

    capturedCallback({
      type: 'NotificationCreated',
      module: 'notifications',
      timestamp: new Date().toISOString(),
      payload: {},
    })

    expect(toast).toHaveBeenCalledWith('New notification')

    visibilitySpy.mockRestore()
  })

  it('does not show toast when tab is hidden', async () => {
    const { toast } = await import('sonner')
    let capturedCallback: Parameters<
      EventStreamContextValue['subscribe']
    >[1] = () => {}
    mockSubscribe.mockImplementation(
      (
        _event: string,
        cb: Parameters<EventStreamContextValue['subscribe']>[1],
      ) => {
        capturedCallback = cb
        return vi.fn()
      },
    )

    const visibilitySpy = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden')

    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })
    mockFetchUnreadCount.mockResolvedValue(0)

    renderWithProviders(<NotificationBell />)

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled()
    })

    capturedCallback({
      type: 'NotificationCreated',
      module: 'notifications',
      timestamp: new Date().toISOString(),
      payload: { title: 'Should not toast' },
    })

    expect(toast).not.toHaveBeenCalled()

    visibilitySpy.mockRestore()
  })

  it('shows "View all notifications" link in popover', async () => {
    mockUseUser.mockReturnValue({
      user: createMockUser({ id: '1', name: 'Test' }),
      isLoading: false,
    })

    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    const link = await screen.findByText('View all notifications')
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/dashboard/notifications')
  })
})
