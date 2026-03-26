import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import type { Inquiry } from '@/lib/wallow/types'
import { renderWithProviders } from '@/test/helpers/render'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const mockFetchMyInquiries = vi.fn()
const mockFetchCurrentUserRoles = vi.fn()
const mockUpdateInquiryStatus = vi.fn()
const mockServerRequireAuth = vi.fn()

vi.mock('@/server-fns/inquiries', () => ({
  fetchMyInquiries: (...args: Array<unknown>) => mockFetchMyInquiries(...args),
  updateInquiryStatus: (...args: Array<unknown>) =>
    mockUpdateInquiryStatus(...args),
}))

vi.mock('@/server-fns/auth', () => ({
  fetchCurrentUserRoles: (...args: Array<unknown>) =>
    mockFetchCurrentUserRoles(...args),
  serverRequireAuth: (...args: Array<unknown>) =>
    mockServerRequireAuth(...args),
}))

vi.mock('@/hooks/useEventStreamEvents', () => ({
  useEventStreamEvents: vi.fn(),
}))

// Mock createFileRoute to extract route config
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    createFileRoute: () => (routeConfig: unknown) => {
      // Make Route.useLoaderData available via a mock
      const route = routeConfig as Record<string, unknown>
      route.useLoaderData = mockUseLoaderData
      return route
    },
    useRouter: () => ({
      invalidate: mockRouterInvalidate,
      navigate: mockRouterNavigate,
    }),
  }
})

const mockRouterInvalidate = vi.fn().mockResolvedValue(undefined)
const mockRouterNavigate = vi.fn()
const mockUseLoaderData = vi.fn()

// ---------------------------------------------------------------------------
// Import route module after mocks
// ---------------------------------------------------------------------------

const routeModule = await import('./inquiries.index')
const routeConfig = routeModule.Route as unknown as {
  loader: () => Promise<{ inquiries: Array<Inquiry>; isAdmin: boolean }>
  beforeLoad: () => Promise<unknown>
  component: React.ComponentType
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 'inq-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    company: 'Acme',
    projectType: 'fullstack',
    budgetRange: '$5k-$15k',
    timeline: '1-3 months',
    message: 'I need a website.',
    status: 'new',
    submitterIpAddress: '127.0.0.1',
    submitterId: 'user-1',
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-01-15T10:30:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests — Loader
// ---------------------------------------------------------------------------

describe('inquiries.index loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchMyInquiries and fetchCurrentUserRoles in parallel', async () => {
    mockFetchMyInquiries.mockResolvedValue([])
    mockFetchCurrentUserRoles.mockResolvedValue({ roles: ['user'] })

    await routeConfig.loader()

    expect(mockFetchMyInquiries).toHaveBeenCalledOnce()
    expect(mockFetchCurrentUserRoles).toHaveBeenCalledOnce()
  })

  it('returns isAdmin=true when user has admin role', async () => {
    mockFetchMyInquiries.mockResolvedValue([])
    mockFetchCurrentUserRoles.mockResolvedValue({ roles: ['user', 'admin'] })

    const result = await routeConfig.loader()

    expect(result.isAdmin).toBe(true)
  })

  it('returns isAdmin=false when user has no admin role', async () => {
    mockFetchMyInquiries.mockResolvedValue([])
    mockFetchCurrentUserRoles.mockResolvedValue({ roles: ['user'] })

    const result = await routeConfig.loader()

    expect(result.isAdmin).toBe(false)
  })

  it('returns the inquiries array from fetchMyInquiries', async () => {
    const inquiries = [makeInquiry({ id: '1' }), makeInquiry({ id: '2' })]
    mockFetchMyInquiries.mockResolvedValue(inquiries)
    mockFetchCurrentUserRoles.mockResolvedValue({ roles: [] })

    const result = await routeConfig.loader()

    expect(result.inquiries).toHaveLength(2)
    expect(result.inquiries[0].id).toBe('1')
  })
})

// ---------------------------------------------------------------------------
// Tests — Component
// ---------------------------------------------------------------------------

describe('DashboardInquiriesPage component', () => {
  const Component = routeConfig.component

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders empty state when no inquiries (admin)', () => {
    mockUseLoaderData.mockReturnValue({ inquiries: [], isAdmin: true })

    renderWithProviders(<Component />)

    expect(screen.getByText('No messages yet')).toBeTruthy()
    expect(
      screen.getByText('Contact form submissions will appear here.'),
    ).toBeTruthy()
  })

  it('renders empty state when no inquiries (non-admin)', () => {
    mockUseLoaderData.mockReturnValue({ inquiries: [], isAdmin: false })

    renderWithProviders(<Component />)

    expect(screen.getByText('No messages yet')).toBeTruthy()
    expect(
      screen.getByText('Inquiries you submit will appear here.'),
    ).toBeTruthy()
  })

  it('renders inquiry rows with name, email, and company', () => {
    const inquiries = [
      makeInquiry({ id: '1', name: 'Alice', email: 'alice@test.com' }),
      makeInquiry({
        id: '2',
        name: 'Bob',
        email: 'bob@test.com',
        company: 'BobCorp',
      }),
    ]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('alice@test.com')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.getByText('bob@test.com')).toBeTruthy()
    expect(screen.getByText('BobCorp')).toBeTruthy()
  })

  it('renders "-" for missing optional fields', () => {
    const inquiries = [
      makeInquiry({
        id: '1',
        company: undefined,
        projectType: undefined,
        budgetRange: undefined,
      }),
    ]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    // Company, projectType, and budgetRange all show '-'
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })

  it('shows human-readable project type labels', () => {
    const inquiries = [makeInquiry({ id: '1', projectType: 'fullstack' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    expect(screen.getByText('Full-Stack Development')).toBeTruthy()
  })

  it('admin sees Select controls for status', () => {
    const inquiries = [makeInquiry({ id: '1', status: 'new' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: true })

    renderWithProviders(<Component />)

    // Select trigger renders the current value — admin should NOT see a Badge
    // but should see a SelectTrigger (button with role combobox)
    const combobox = screen.getByRole('combobox')
    expect(combobox).toBeTruthy()
  })

  it('non-admin sees Badge for status instead of Select', () => {
    const inquiries = [makeInquiry({ id: '1', status: 'new' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    // Non-admin should see the status as a Badge text
    expect(screen.getByText('New')).toBeTruthy()
    // No combobox should be present
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('shows "new" badge count in header', () => {
    const inquiries = [
      makeInquiry({ id: '1', status: 'new' }),
      makeInquiry({ id: '2', status: 'new' }),
      makeInquiry({ id: '3', status: 'reviewed' }),
    ]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    expect(screen.getByText('2 new')).toBeTruthy()
  })

  it('shows summary count text', () => {
    const inquiries = [makeInquiry({ id: '1' }), makeInquiry({ id: '2' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    expect(screen.getByText('Showing 2 messages')).toBeTruthy()
  })

  it('shows singular "message" when only 1 inquiry', () => {
    const inquiries = [makeInquiry({ id: '1' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    expect(screen.getByText('Showing 1 message')).toBeTruthy()
  })

  it('renders the Refresh button', () => {
    mockUseLoaderData.mockReturnValue({ inquiries: [], isAdmin: false })

    renderWithProviders(<Component />)

    expect(screen.getByText('Refresh')).toBeTruthy()
  })

  it('navigates to inquiry detail when row is clicked', () => {
    const inquiries = [makeInquiry({ id: 'inq-click-1' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    // Click the row (the name cell is part of the row)
    const nameCell = screen.getByText('Jane Doe')
    fireEvent.click(nameCell)

    expect(mockRouterNavigate).toHaveBeenCalledWith({
      to: '/dashboard/inquiries/$id',
      params: { id: 'inq-click-1' },
    })
  })

  it('falls back to raw projectType when no label mapping exists', () => {
    const inquiries = [
      makeInquiry({ id: '1', projectType: 'custom_unknown_type' }),
    ]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    expect(screen.getByText('custom_unknown_type')).toBeTruthy()
  })

  it('calls updateInquiryStatus when admin changes status via Select', async () => {
    // Mock scrollIntoView for Radix Select
    Element.prototype.scrollIntoView = vi.fn()
    mockUpdateInquiryStatus.mockResolvedValue(undefined)
    const inquiries = [makeInquiry({ id: 'inq-status-1', status: 'new' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: true })

    renderWithProviders(<Component />)

    // Open the select dropdown
    const combobox = screen.getByRole('combobox')
    fireEvent.click(combobox)

    // Select the 'Reviewed' option
    await waitFor(() => {
      const option = screen.getByText('Reviewed')
      fireEvent.click(option)
    })

    await waitFor(() => {
      expect(mockUpdateInquiryStatus).toHaveBeenCalledWith({
        data: { id: 'inq-status-1', status: 'reviewed' },
      })
    })
  })

  it('falls back to raw status label for unknown status values (non-admin)', () => {
    const inquiries = [makeInquiry({ id: '1', status: 'in_progress' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: false })

    renderWithProviders(<Component />)

    // STATUS_LABELS has no 'in_progress' key, so it falls back to
    // inquiry.status.replace('_', ' ')
    expect(screen.getByText('in progress')).toBeTruthy()
  })

  it('handles status change error gracefully', async () => {
    // Mock scrollIntoView for Radix Select
    Element.prototype.scrollIntoView = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockUpdateInquiryStatus.mockRejectedValue(new Error('API error'))
    const inquiries = [makeInquiry({ id: 'inq-err', status: 'new' })]
    mockUseLoaderData.mockReturnValue({ inquiries, isAdmin: true })

    renderWithProviders(<Component />)

    const combobox = screen.getByRole('combobox')
    fireEvent.click(combobox)

    await waitFor(() => {
      const option = screen.getByText('Closed')
      fireEvent.click(option)
    })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update status:',
        expect.any(Error),
      )
    })

    consoleSpy.mockRestore()
  })
})
