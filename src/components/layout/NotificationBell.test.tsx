import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { NotificationBell } from './NotificationBell'
import { renderWithProviders } from '@/test/helpers/render'

const mockUseUser = vi.fn(() => ({ user: null, isLoading: false }))
const mockSubscribe = vi.fn(() => vi.fn())
const mockFetchNotifications = vi.fn(() => Promise.resolve([]))
const mockFetchUnreadCount = vi.fn(() => Promise.resolve(0))

vi.mock('@/hooks/useUser', () => ({
  useUser: (...args: Array<unknown>) => mockUseUser(...args),
}))

vi.mock('@/hooks/useSignalR', () => ({
  useSignalR: () => ({ subscribe: mockSubscribe }),
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
})
