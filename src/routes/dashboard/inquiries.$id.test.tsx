import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanup, screen } from '@testing-library/react'
import type { Inquiry, InquiryComment } from '@/lib/wallow/types'
import { renderWithProviders } from '@/test/helpers/render'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const mockFetchInquiry = vi.fn()
const mockFetchInquiryComments = vi.fn()
const mockFetchCurrentUserRoles = vi.fn()
const mockServerRequireAuth = vi.fn()
const mockSubmitInquiryComment = vi.fn()

vi.mock('@/server-fns/inquiries', () => ({
  fetchInquiry: (...args: Array<unknown>) => mockFetchInquiry(...args),
  fetchInquiryComments: (...args: Array<unknown>) =>
    mockFetchInquiryComments(...args),
  submitInquiryComment: (...args: Array<unknown>) =>
    mockSubmitInquiryComment(...args),
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

const mockUseLoaderData = vi.fn()

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    createFileRoute: () => (routeConfig: unknown) => {
      const route = routeConfig as Record<string, unknown>
      route.useLoaderData = mockUseLoaderData
      return route
    },
    useRouter: () => ({
      invalidate: vi.fn(),
      navigate: vi.fn(),
    }),
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string
      children: React.ReactNode
      [key: string]: unknown
    }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  }
})

// ---------------------------------------------------------------------------
// Import route module after mocks
// ---------------------------------------------------------------------------

const routeModule = await import('./inquiries.$id')
const routeConfig = routeModule.Route as unknown as {
  loader: (ctx: { params: { id: string } }) => Promise<{
    inquiry: Inquiry
    comments: Array<InquiryComment>
    isAdmin: boolean
  }>
  beforeLoad: () => Promise<unknown>
  component: React.ComponentType
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const TEST_ID = 'inq-abc-123'

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: TEST_ID,
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    company: 'Acme Corp',
    projectType: 'Full-Stack',
    budgetRange: '$5k-$15k',
    timeline: '1-3 months',
    message: 'I need a website built for my business.',
    status: 'new',
    submitterIpAddress: '127.0.0.1',
    submitterId: 'user-1',
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-01-15T10:30:00Z',
    ...overrides,
  }
}

function makeComment(overrides: Partial<InquiryComment> = {}): InquiryComment {
  return {
    id: 'comment-1',
    inquiryId: TEST_ID,
    authorId: 'user-1',
    authorName: 'Test User',
    content: 'A public comment',
    isInternal: false,
    createdAt: '2026-01-16T08:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests — Loader
// ---------------------------------------------------------------------------

describe('inquiries.$id loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchInquiry, fetchInquiryComments, and fetchCurrentUserRoles in parallel', async () => {
    mockFetchInquiry.mockResolvedValue(makeInquiry())
    mockFetchInquiryComments.mockResolvedValue([])
    mockFetchCurrentUserRoles.mockResolvedValue({ roles: ['user'] })

    await routeConfig.loader({ params: { id: TEST_ID } })

    expect(mockFetchInquiry).toHaveBeenCalledWith({ data: { id: TEST_ID } })
    expect(mockFetchInquiryComments).toHaveBeenCalledWith({
      data: { id: TEST_ID },
    })
    expect(mockFetchCurrentUserRoles).toHaveBeenCalledOnce()
  })

  it('returns isAdmin=true when user has admin role', async () => {
    mockFetchInquiry.mockResolvedValue(makeInquiry())
    mockFetchInquiryComments.mockResolvedValue([])
    mockFetchCurrentUserRoles.mockResolvedValue({ roles: ['user', 'admin'] })

    const result = await routeConfig.loader({ params: { id: TEST_ID } })

    expect(result.isAdmin).toBe(true)
  })

  it('returns isAdmin=false when user lacks admin role', async () => {
    mockFetchInquiry.mockResolvedValue(makeInquiry())
    mockFetchInquiryComments.mockResolvedValue([])
    mockFetchCurrentUserRoles.mockResolvedValue({ roles: ['user'] })

    const result = await routeConfig.loader({ params: { id: TEST_ID } })

    expect(result.isAdmin).toBe(false)
  })

  it('returns the inquiry and comments from the loader', async () => {
    const inquiry = makeInquiry()
    const comments = [makeComment(), makeComment({ id: 'comment-2' })]
    mockFetchInquiry.mockResolvedValue(inquiry)
    mockFetchInquiryComments.mockResolvedValue(comments)
    mockFetchCurrentUserRoles.mockResolvedValue({ roles: [] })

    const result = await routeConfig.loader({ params: { id: TEST_ID } })

    expect(result.inquiry.id).toBe(TEST_ID)
    expect(result.comments).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Tests — Component
// ---------------------------------------------------------------------------

describe('InquiryDetailPage component', () => {
  const Component = routeConfig.component

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders inquiry detail fields', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments: [],
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    expect(screen.getByText('Jane Doe')).toBeTruthy()
    expect(screen.getByText('jane@example.com')).toBeTruthy()
    expect(screen.getByText('Acme Corp')).toBeTruthy()
    expect(screen.getByText('Full-Stack')).toBeTruthy()
    expect(screen.getByText('$5k-$15k')).toBeTruthy()
    expect(screen.getByText('1-3 months')).toBeTruthy()
    expect(
      screen.getByText('I need a website built for my business.'),
    ).toBeTruthy()
  })

  it('renders the "Inquiry Details" heading', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments: [],
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    expect(screen.getByText('Inquiry Details')).toBeTruthy()
  })

  it('renders the "Back to inquiries" link', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments: [],
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    const backLink = screen.getByText('Back to inquiries')
    expect(backLink.closest('a')?.getAttribute('href')).toBe(
      '/dashboard/inquiries',
    )
  })

  it('renders the status badge', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry({ status: 'in_progress' }),
      comments: [],
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    expect(screen.getByText('in progress')).toBeTruthy()
  })

  it('renders "No comments yet." when there are no visible comments', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments: [],
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    expect(screen.getByText('No comments yet.')).toBeTruthy()
  })

  it('renders public comments for non-admin users', () => {
    const comments = [
      makeComment({ id: 'c1', content: 'Public note', isInternal: false }),
      makeComment({
        id: 'c2',
        content: 'Secret internal note',
        isInternal: true,
      }),
    ]
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments,
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    // Non-admin should see public comment
    expect(screen.getByText('Public note')).toBeTruthy()
    // Non-admin should NOT see internal comment
    expect(screen.queryByText('Secret internal note')).toBeNull()
  })

  it('admin sees all comments including internal', () => {
    const comments = [
      makeComment({ id: 'c1', content: 'Public note', isInternal: false }),
      makeComment({
        id: 'c2',
        content: 'Secret internal note',
        isInternal: true,
      }),
    ]
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments,
      isAdmin: true,
    })

    renderWithProviders(<Component />)

    expect(screen.getByText('Public note')).toBeTruthy()
    expect(screen.getByText('Secret internal note')).toBeTruthy()
  })

  it('admin sees "Internal" badge on internal comments', () => {
    const comments = [
      makeComment({ id: 'c1', content: 'Internal stuff', isInternal: true }),
    ]
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments,
      isAdmin: true,
    })

    renderWithProviders(<Component />)

    expect(screen.getByText('Internal')).toBeTruthy()
  })

  it('admin sees "Internal note" checkbox', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments: [],
      isAdmin: true,
    })

    renderWithProviders(<Component />)

    expect(
      screen.getByText('Internal note (not visible to submitter)'),
    ).toBeTruthy()
  })

  it('non-admin does NOT see "Internal note" checkbox', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments: [],
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    expect(
      screen.queryByText('Internal note (not visible to submitter)'),
    ).toBeNull()
  })

  it('renders the comment textarea and Send button', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments: [],
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    expect(screen.getByPlaceholderText('Write a comment...')).toBeTruthy()
    expect(screen.getByText('Send')).toBeTruthy()
  })

  it('renders comment author names and content', () => {
    const comments = [
      makeComment({
        id: 'c1',
        authorName: 'Alice Smith',
        content: 'Great work!',
      }),
    ]
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry(),
      comments,
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    expect(screen.getByText('Alice Smith')).toBeTruthy()
    expect(screen.getByText('Great work!')).toBeTruthy()
  })

  it('hides optional fields when not present', () => {
    mockUseLoaderData.mockReturnValue({
      inquiry: makeInquiry({
        company: undefined,
        projectType: undefined,
        budgetRange: undefined,
        timeline: undefined,
      }),
      comments: [],
      isAdmin: false,
    })

    renderWithProviders(<Component />)

    // These labels should NOT be present since conditional rendering hides them
    expect(screen.queryByText('Company')).toBeNull()
    expect(screen.queryByText('Project Type')).toBeNull()
    expect(screen.queryByText('Budget')).toBeNull()
    expect(screen.queryByText('Timeline')).toBeNull()
  })
})
