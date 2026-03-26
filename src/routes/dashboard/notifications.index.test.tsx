import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import type { Notification } from '@/lib/wallow/types'
import { renderWithProviders } from '@/test/helpers/render'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToast = { success: vi.fn(), error: vi.fn() }
vi.mock('sonner', () => ({
  toast: mockToast,
}))

const mockFetchNotifications = vi.fn()
const mockMarkNotificationRead = vi.fn()
const mockMarkAllNotificationsRead = vi.fn()

vi.mock('@/server-fns/notifications', () => ({
  fetchNotifications: (...args: Array<unknown>) =>
    mockFetchNotifications(...args),
  markNotificationRead: (...args: Array<unknown>) =>
    mockMarkNotificationRead(...args),
  markAllNotificationsRead: (...args: Array<unknown>) =>
    mockMarkAllNotificationsRead(...args),
}))

vi.mock('@/server-fns/auth', () => ({
  serverRequireAuth: vi.fn(),
}))

vi.mock('@/hooks/useEventStreamEvents', () => ({
  useEventStreamEvents: vi.fn(),
}))

const mockUseNotificationFilters = vi.fn()
vi.mock('@/hooks/useNotificationFilters', () => ({
  notificationTypes: [
    'TaskAssigned',
    'InquirySubmitted',
    'InquiryComment',
    'SystemAlert',
    'Announcement',
    'BillingInvoice',
    'Mention',
  ],
  useNotificationFilters: (...args: Array<unknown>) =>
    mockUseNotificationFilters(...args),
}))

const mockUseNotificationSelection = vi.fn()
vi.mock('@/hooks/useNotificationSelection', () => ({
  useNotificationSelection: (...args: Array<unknown>) =>
    mockUseNotificationSelection(...args),
}))

vi.mock('@/lib/notifications/query-utils', () => ({
  invalidateNotifications: vi.fn(),
}))

vi.mock('@/lib/notifications/routing', () => ({
  getNotificationRoute: vi.fn(() => '/dashboard'),
}))

vi.mock('@/lib/format', () => ({
  formatRelativeTime: vi.fn((d: string) => d),
}))

const mockNavigate = vi.fn()
const mockUseLoaderData = vi.fn()

// createFileRoute mock: returns a function that takes config and returns
// the config merged with a useLoaderData spy — this way the component's
// `Route.useLoaderData()` call goes through our mock.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => ({
    ...config,
    useLoaderData: () => mockUseLoaderData(),
  }),
  useNavigate: () => mockNavigate,
}))

// ---------------------------------------------------------------------------
// Import route after mocks
// ---------------------------------------------------------------------------

const routeModule = await import('./notifications.index')
const routeConfig = routeModule.Route as unknown as {
  loader: () => Promise<{ notifications: Array<Notification> }>
  component: React.ComponentType
}

const NotificationsPage = routeConfig.component

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNotification(
  overrides: Partial<Notification> & Pick<Notification, 'id'>,
): Notification {
  return {
    userId: 'user-1',
    type: 'TaskAssigned',
    title: 'Test notification',
    message: 'Test message body',
    isRead: false,
    readAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function setupFiltersMock(
  overrides: Record<string, unknown> = {},
  notifications: Array<Notification> = [],
) {
  const unreadCount =
    overrides.unreadCount ?? notifications.filter((n) => !n.isRead).length
  mockUseNotificationFilters.mockReturnValue({
    unreadOnly: false,
    activeType: null,
    page: 1,
    setPage: vi.fn(),
    filtered: notifications,
    unreadCount,
    handleTabChange: vi.fn(),
    handleTypeFilter: vi.fn(),
    ...overrides,
  })
}

function setupSelectionMock(overrides: Record<string, unknown> = {}) {
  mockUseNotificationSelection.mockReturnValue({
    selectedIds: new Set<string>(),
    allSelected: false,
    selectAll: vi.fn(),
    selectOne: vi.fn(),
    clearSelection: vi.fn(),
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('notifications.index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMarkNotificationRead.mockResolvedValue(undefined)
    mockMarkAllNotificationsRead.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  // ---- Loader tests ----

  describe('loader', () => {
    it('returns notifications from fetchNotifications', async () => {
      const fakeData = [makeNotification({ id: '1' })]
      mockFetchNotifications.mockResolvedValue(fakeData)

      const result = await routeConfig.loader()

      expect(mockFetchNotifications).toHaveBeenCalledOnce()
      expect(result).toEqual({ notifications: fakeData })
    })
  })

  // ---- Component tests ----

  describe('component', () => {
    it('renders empty state when no notifications', () => {
      mockUseLoaderData.mockReturnValue({ notifications: [] })
      setupFiltersMock({}, [])
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByText('No notifications')).toBeTruthy()
      expect(screen.getByText('You have no notifications yet.')).toBeTruthy()
    })

    it('renders empty state with unread message when filtering unread', () => {
      mockUseLoaderData.mockReturnValue({ notifications: [] })
      setupFiltersMock({ unreadOnly: true }, [])
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByText('You have no unread notifications.')).toBeTruthy()
    })

    it('renders notification rows when present', () => {
      const notifications = [
        makeNotification({ id: '1', title: 'First alert' }),
        makeNotification({
          id: '2',
          title: 'Second alert',
          isRead: true,
        }),
      ]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({}, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByText('First alert')).toBeTruthy()
      expect(screen.getByText('Second alert')).toBeTruthy()
    })

    it('shows unread count badge when unreadCount > 0', () => {
      const notifications = [
        makeNotification({ id: '1', isRead: false }),
        makeNotification({ id: '2', isRead: true }),
      ]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({ unreadCount: 1 }, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByText('1 unread')).toBeTruthy()
    })

    it('does not show unread count badge when unreadCount is 0', () => {
      const notifications = [makeNotification({ id: '1', isRead: true })]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({ unreadCount: 0 }, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.queryByText(/unread/)).toBeNull()
    })

    it('"Mark all as read" button is disabled when unreadCount === 0', () => {
      const notifications = [makeNotification({ id: '1', isRead: true })]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({ unreadCount: 0 }, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      const btn = screen.getByRole('button', { name: /mark all as read/i })
      expect(btn).toBeTruthy()
      expect((btn as HTMLButtonElement).disabled).toBe(true)
    })

    it('"Mark all as read" button is enabled when unreadCount > 0', () => {
      const notifications = [makeNotification({ id: '1', isRead: false })]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({ unreadCount: 1 }, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      const btn = screen.getByRole('button', { name: /mark all as read/i })
      expect((btn as HTMLButtonElement).disabled).toBe(false)
    })

    it('renders filter chip buttons for all notification types', () => {
      mockUseLoaderData.mockReturnValue({ notifications: [] })
      setupFiltersMock({}, [])
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByRole('button', { name: 'Tasks' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Inquiries' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Announcements' })).toBeTruthy()
    })

    it('shows "Showing N notification(s)" summary text', () => {
      const notifications = [
        makeNotification({ id: '1' }),
        makeNotification({ id: '2' }),
      ]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({}, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByText('Showing 2 notifications')).toBeTruthy()
    })

    it('clicking a notification row triggers navigate', () => {
      const notification = makeNotification({
        id: '1',
        title: 'Click me',
        isRead: true,
      })
      mockUseLoaderData.mockReturnValue({
        notifications: [notification],
      })
      setupFiltersMock({}, [notification])
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      fireEvent.click(screen.getByText('Click me'))
      expect(mockNavigate).toHaveBeenCalled()
    })

    // --- Line 181: selectedIds.size > 0 shows "N selected" text ---

    it('shows selected count when items are selected', () => {
      const notifications = [
        makeNotification({ id: '1' }),
        makeNotification({ id: '2' }),
      ]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({}, notifications)
      setupSelectionMock({ selectedIds: new Set(['1', '2']) })

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByText('2 selected')).toBeTruthy()
    })

    it('shows "Select all" when no items are selected', () => {
      const notifications = [makeNotification({ id: '1' })]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({}, notifications)
      setupSelectionMock({ selectedIds: new Set() })

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByText('Select all')).toBeTruthy()
    })

    // --- Line 192: Loader2 spinner when markAllReadMutation.isPending ---

    it('shows spinner when mark all read mutation is pending', async () => {
      const notifications = [makeNotification({ id: '1', isRead: false })]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({ unreadCount: 1 }, notifications)
      setupSelectionMock()

      // Make markAllNotificationsRead hang so isPending stays true
      mockMarkAllNotificationsRead.mockReturnValue(new Promise(() => {}))

      renderWithProviders(<NotificationsPage />)

      const btn = screen.getByRole('button', { name: /mark all as read/i })
      fireEvent.click(btn)

      // Wait for React to re-render with isPending=true
      await vi.waitFor(() => {
        const spinner = btn.querySelector('.animate-spin')
        expect(spinner).toBeTruthy()
      })
    })

    // --- Lines 231-239: "Load more" button when filteredNotifications.length >= 20 ---

    it('shows "Load more" button when 20 or more notifications', () => {
      const notifications = Array.from({ length: 20 }, (_, i) =>
        makeNotification({ id: `n-${i}`, title: `Notification ${i}` }),
      )
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({}, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.getByRole('button', { name: 'Load more' })).toBeTruthy()
    })

    it('does not show "Load more" button when fewer than 20 notifications', () => {
      const notifications = [makeNotification({ id: '1' })]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({}, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
    })

    it('"Load more" calls setPage when clicked', () => {
      const mockSetPage = vi.fn()
      const notifications = Array.from({ length: 20 }, (_, i) =>
        makeNotification({ id: `n-${i}`, title: `Notification ${i}` }),
      )
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({ setPage: mockSetPage }, notifications)
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      const btn = screen.getByRole('button', { name: 'Load more' })
      fireEvent.click(btn)

      expect(mockSetPage).toHaveBeenCalledOnce()
      // Verify setPage receives an updater function that increments page
      const updater = mockSetPage.mock.calls[0][0]
      expect(typeof updater).toBe('function')
      expect(updater(1)).toBe(2)
      expect(updater(3)).toBe(4)
    })

    it('markAllRead onError calls toast.error with failure message', async () => {
      const notifications = [makeNotification({ id: '1', isRead: false })]
      mockUseLoaderData.mockReturnValue({ notifications })
      setupFiltersMock({ unreadCount: 1 }, notifications)
      setupSelectionMock()

      mockMarkAllNotificationsRead.mockRejectedValue(
        new Error('Network failure'),
      )

      renderWithProviders(<NotificationsPage />)

      const btn = screen.getByRole('button', { name: /mark all as read/i })
      fireEvent.click(btn)

      await vi.waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Failed to mark all as read: Network failure',
        )
      })
    })

    it('clicking an unread notification calls markNotificationRead', async () => {
      const notification = makeNotification({
        id: 'unread-1',
        title: 'Unread notification',
        isRead: false,
      })
      mockUseLoaderData.mockReturnValue({
        notifications: [notification],
      })
      setupFiltersMock({}, [notification])
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      fireEvent.click(screen.getByText('Unread notification'))

      await vi.waitFor(() => {
        expect(mockMarkNotificationRead).toHaveBeenCalledWith({
          data: { id: 'unread-1' },
        })
      })
      expect(mockNavigate).toHaveBeenCalled()
    })

    it('clicking a read notification does not call markNotificationRead', () => {
      const notification = makeNotification({
        id: 'read-1',
        title: 'Read notification',
        isRead: true,
      })
      mockUseLoaderData.mockReturnValue({
        notifications: [notification],
      })
      setupFiltersMock({}, [notification])
      setupSelectionMock()

      renderWithProviders(<NotificationsPage />)

      fireEvent.click(screen.getByText('Read notification'))

      expect(mockMarkNotificationRead).not.toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalled()
    })
  })
})
