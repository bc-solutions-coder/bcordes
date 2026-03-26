import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { NotificationBell } from './NotificationBell'
import type { Notification } from '@/lib/wallow/types'
import { renderWithProviders } from '@/test/helpers/render'

const mockUseUser = vi.fn(() => ({ user: null, isLoading: false }))
const mockSubscribe = vi.fn(() => vi.fn())
const mockFetchNotifications = vi.fn(() => Promise.resolve([]))
const mockFetchUnreadCount = vi.fn(() => Promise.resolve(0))

vi.mock('@/hooks/useUser', () => ({
  useUser: (...args: Array<unknown>) => mockUseUser(...args),
}))

vi.mock('@/hooks/useEventStream', () => ({
  useEventStream: () => ({ subscribe: mockSubscribe }),
}))

vi.mock('@/server-fns/notifications', () => ({
  fetchNotifications: (...args: Array<unknown>) =>
    mockFetchNotifications(...args),
  fetchUnreadCount: (...args: Array<unknown>) => mockFetchUnreadCount(...args),
  markNotificationRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsRead: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/notifications/query-utils', () => ({
  invalidateNotifications: vi.fn(),
}))

vi.mock('@/lib/notifications/routing', () => ({
  getNotificationRoute: vi.fn(() => '/dashboard/notifications'),
}))

vi.mock('@/lib/format', () => ({
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
      user: { id: '1', name: 'Test' },
      isLoading: false,
    })
    renderWithProviders(<NotificationBell />)
    expect(screen.getByRole('button', { name: /notifications/i })).toBeDefined()
  })

  it('shows badge with unread count when > 0', async () => {
    mockUseUser.mockReturnValue({
      user: { id: '1', name: 'Test' },
      isLoading: false,
    })
    mockFetchUnreadCount.mockResolvedValue(5)

    renderWithProviders(<NotificationBell />)

    const badge = await screen.findByText('5')
    expect(badge).toBeDefined()
  })

  it('does not show badge when count is 0', () => {
    mockUseUser.mockReturnValue({
      user: { id: '1', name: 'Test' },
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
      user: { id: '1', name: 'Test' },
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
        createdAt: '2026-03-24T10:00:00Z',
        updatedAt: '2026-03-24T10:00:00Z',
      },
    ]
    mockUseUser.mockReturnValue({
      user: { id: '1', name: 'Test' },
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
    // formatRelativeTime is mocked to return 'just now'
    expect(screen.getAllByText('just now')).toHaveLength(2)
  })

  it('calls markAllRead when "Mark all as read" is clicked', async () => {
    const { markAllNotificationsRead } =
      await import('@/server-fns/notifications')
    const notifications: Array<Notification> = [
      {
        id: 'n1',
        userId: '1',
        type: 'inquiry',
        title: 'Unread Notification',
        message: 'Please read me',
        isRead: false,
        readAt: null,
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
      },
    ]
    mockUseUser.mockReturnValue({
      user: { id: '1', name: 'Test' },
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

    const { markNotificationRead } = await import('@/server-fns/notifications')

    const notifications: Array<Notification> = [
      {
        id: 'n1',
        userId: '1',
        type: 'inquiry',
        title: 'Click Me',
        message: 'Clickable notification',
        isRead: false,
        readAt: null,
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
      },
    ]
    mockUseUser.mockReturnValue({
      user: { id: '1', name: 'Test' },
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

  it('shows "View all notifications" link in popover', async () => {
    mockUseUser.mockReturnValue({
      user: { id: '1', name: 'Test' },
      isLoading: false,
    })

    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    const link = await screen.findByText('View all notifications')
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/dashboard/notifications')
  })
})
