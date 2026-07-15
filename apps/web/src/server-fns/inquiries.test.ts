import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSession } from '@bcordes/auth/session'
import { requireAdmin } from '@bcordes/auth/middleware'
import {
  createMockAdminSession,
  createMockSession,
} from '@bcordes/auth/testing'
import { createWallowClient } from '@bcordes/wallow/client'
import { serviceClient } from '@bcordes/wallow/service-client'
import { createMockWallowClient, jsonResponse } from '@bcordes/wallow/testing'
import {
  fetchInquiries,
  fetchInquiry,
  fetchInquiryComments,
  fetchMyInquiries,
  submitInquiry,
  submitInquiryComment,
  updateInquiryStatus,
} from './inquiries'
import type { Inquiry, InquiryComment } from '@bcordes/wallow/types'
import type { MockWallowClient } from '@bcordes/wallow/testing'

// ---------------------------------------------------------------------------
// Imports (after mocks are hoisted)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mock @tanstack/react-start so createServerFn chains resolve to the handler
// ---------------------------------------------------------------------------
vi.mock('@tanstack/react-start', () => {
  const createServerFn = () => {
    let handlerFn: (...args: Array<unknown>) => unknown
    const chain = {
      inputValidator: () => chain,
      handler: (fn: (...args: Array<unknown>) => unknown) => {
        handlerFn = fn
        const callable = (...args: Array<unknown>) => handlerFn(...args)
        Object.assign(callable, chain)
        return callable
      },
    }
    return chain
  }
  return { createServerFn }
})

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

let mockClient: MockWallowClient
let mockServiceClient: MockWallowClient

vi.mock('@bcordes/wallow/client', () => ({
  createWallowClient: vi.fn(),
}))

vi.mock('@bcordes/wallow/service-client', () => ({
  serviceClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    head: vi.fn(),
  },
}))

vi.mock('@bcordes/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@bcordes/auth/middleware', () => ({
  requireAdmin: vi.fn(),
}))

const mockedCreateWallowClient = vi.mocked(createWallowClient)
const mockedGetSession = vi.mocked(getSession)
const mockedRequireAdmin = vi.mocked(requireAdmin)
const mockedServiceClient = vi.mocked(serviceClient)

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const TEST_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: TEST_UUID,
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    company: 'Acme',
    projectType: 'Full-Stack',
    budgetRange: '$5k-$15k',
    timeline: '1-3 months',
    message: 'I need a website.',
    status: 'New',
    submitterIpAddress: '127.0.0.1',
    submitterId: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeComment(overrides: Partial<InquiryComment> = {}): InquiryComment {
  return {
    id: 'comment-1',
    inquiryId: TEST_UUID,
    authorId: 'user-1',
    authorName: 'Test User',
    content: 'A comment',
    isInternal: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const validSubmitData = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-1234',
  company: 'Acme',
  projectType: 'Full-Stack' as const,
  budgetRange: '$5k-$15k' as const,
  timeline: '1-3 months' as const,
  message: 'I need a website.',
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockClient = createMockWallowClient()
  mockServiceClient = createMockWallowClient()
  mockedCreateWallowClient.mockResolvedValue(mockClient as never)
  // Wire up service client mock methods
  mockedServiceClient.get.mockImplementation(mockServiceClient.get)
  mockedServiceClient.post.mockImplementation(mockServiceClient.post)
  mockedServiceClient.patch.mockImplementation(mockServiceClient.patch)
})

// ---------------------------------------------------------------------------
// submitInquiry
// ---------------------------------------------------------------------------

describe('submitInquiry', () => {
  it('uses serviceClient.post when user is anonymous (no session)', async () => {
    const inquiry = makeInquiry({ status: 'New' })
    mockedGetSession.mockResolvedValue(null)
    mockServiceClient.post.mockResolvedValue(jsonResponse(inquiry))

    const result = await (submitInquiry as (arg?: unknown) => Promise<Inquiry>)(
      { data: validSubmitData },
    )

    expect(mockedGetSession).toHaveBeenCalled()
    expect(mockedServiceClient.post).toHaveBeenCalledWith(
      '/v1/inquiries',
      validSubmitData,
    )
    expect(mockedCreateWallowClient).not.toHaveBeenCalled()
    expect(result.status).toBe('new') // normalized
  })

  it('uses createWallowClient when user is authenticated', async () => {
    const inquiry = makeInquiry({ status: 'New' })
    mockedGetSession.mockResolvedValue(createMockSession())
    mockClient.post.mockResolvedValue(jsonResponse(inquiry))

    const result = await (submitInquiry as (arg?: unknown) => Promise<Inquiry>)(
      { data: validSubmitData },
    )

    expect(mockedCreateWallowClient).toHaveBeenCalled()
    expect(mockClient.post).toHaveBeenCalledWith(
      '/v1/inquiries',
      validSubmitData,
    )
    expect(result.status).toBe('new')
  })

  it('normalizes status via STATUS_TO_FRONTEND', async () => {
    const inquiry = makeInquiry({ status: 'Reviewed' })
    mockedGetSession.mockResolvedValue(null)
    mockServiceClient.post.mockResolvedValue(jsonResponse(inquiry))

    const result = await (submitInquiry as (arg?: unknown) => Promise<Inquiry>)(
      { data: validSubmitData },
    )

    expect(result.status).toBe('reviewed')
  })

  it('lowercases unknown statuses as fallback', async () => {
    const inquiry = makeInquiry({ status: 'CustomStatus' })
    mockedGetSession.mockResolvedValue(null)
    mockServiceClient.post.mockResolvedValue(jsonResponse(inquiry))

    const result = await (submitInquiry as (arg?: unknown) => Promise<Inquiry>)(
      { data: validSubmitData },
    )

    expect(result.status).toBe('customstatus')
  })
})

// ---------------------------------------------------------------------------
// fetchInquiries
// ---------------------------------------------------------------------------

describe('fetchInquiries', () => {
  it('calls requireAdmin and returns normalized statuses', async () => {
    const inquiries = [
      makeInquiry({ id: '1', status: 'New' }),
      makeInquiry({ id: '2', status: 'Contacted' }),
    ]
    mockedRequireAdmin.mockResolvedValue(createMockAdminSession().user)
    mockClient.get.mockResolvedValue(jsonResponse(inquiries))

    const result = await (
      fetchInquiries as (arg?: unknown) => Promise<Array<Inquiry>>
    )()

    expect(mockedRequireAdmin).toHaveBeenCalled()
    expect(mockClient.get).toHaveBeenCalledWith('/v1/inquiries')
    expect(result).toHaveLength(2)
    expect(result[0].status).toBe('new')
    expect(result[1].status).toBe('contacted')
  })
})

// ---------------------------------------------------------------------------
// fetchMyInquiries
// ---------------------------------------------------------------------------

describe('fetchMyInquiries', () => {
  it('admin fetches from /v1/inquiries', async () => {
    const inquiries = [makeInquiry({ status: 'New' })]
    mockedGetSession.mockResolvedValue(createMockAdminSession())
    mockClient.get.mockResolvedValue(jsonResponse(inquiries))

    const result = await (
      fetchMyInquiries as (arg?: unknown) => Promise<Array<Inquiry>>
    )()

    expect(mockClient.get).toHaveBeenCalledWith('/v1/inquiries')
    expect(result[0].status).toBe('new')
  })

  it('non-admin fetches from /v1/inquiries/submitted', async () => {
    const inquiries = [makeInquiry({ status: 'Reviewed' })]
    mockedGetSession.mockResolvedValue(createMockSession())
    mockClient.get.mockResolvedValue(jsonResponse(inquiries))

    const result = await (
      fetchMyInquiries as (arg?: unknown) => Promise<Array<Inquiry>>
    )()

    expect(mockClient.get).toHaveBeenCalledWith('/v1/inquiries/submitted')
    expect(result[0].status).toBe('reviewed')
  })

  it('null session (unauthenticated) fetches from /v1/inquiries/submitted', async () => {
    const inquiries: Array<Inquiry> = []
    mockedGetSession.mockResolvedValue(null)
    mockClient.get.mockResolvedValue(jsonResponse(inquiries))

    const result = await (
      fetchMyInquiries as (arg?: unknown) => Promise<Array<Inquiry>>
    )()

    expect(mockClient.get).toHaveBeenCalledWith('/v1/inquiries/submitted')
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// fetchInquiry
// ---------------------------------------------------------------------------

describe('fetchInquiry', () => {
  it('fetches a single inquiry by UUID and normalizes status', async () => {
    const inquiry = makeInquiry({ status: 'Closed' })
    mockClient.get.mockResolvedValue(jsonResponse(inquiry))

    const result = await (fetchInquiry as (arg?: unknown) => Promise<Inquiry>)({
      data: { id: TEST_UUID },
    })

    expect(mockClient.get).toHaveBeenCalledWith(`/v1/inquiries/${TEST_UUID}`)
    expect(result.status).toBe('closed')
  })
})

// ---------------------------------------------------------------------------
// updateInquiryStatus
// ---------------------------------------------------------------------------

describe('updateInquiryStatus', () => {
  it('calls requireAdmin and converts status via STATUS_TO_API', async () => {
    const updated = makeInquiry({ status: 'Reviewed' })
    mockedRequireAdmin.mockResolvedValue(createMockAdminSession().user)
    mockClient.patch.mockResolvedValue(jsonResponse(updated))

    const result = await (
      updateInquiryStatus as (arg?: unknown) => Promise<Inquiry>
    )({
      data: { id: TEST_UUID, status: 'reviewed' },
    })

    expect(mockedRequireAdmin).toHaveBeenCalled()
    expect(mockClient.patch).toHaveBeenCalledWith(
      `/v1/inquiries/${TEST_UUID}/status`,
      { newStatus: 'Reviewed' },
    )
    expect(result.status).toBe('reviewed')
  })

  it('passes through unknown status values unmodified', async () => {
    const updated = makeInquiry({ status: 'SomeCustom' })
    mockedRequireAdmin.mockResolvedValue(createMockAdminSession().user)
    mockClient.patch.mockResolvedValue(jsonResponse(updated))

    await (updateInquiryStatus as (arg?: unknown) => Promise<Inquiry>)({
      data: { id: TEST_UUID, status: 'unknown-status' },
    })

    expect(mockClient.patch).toHaveBeenCalledWith(
      `/v1/inquiries/${TEST_UUID}/status`,
      { newStatus: 'unknown-status' },
    )
  })
})

// ---------------------------------------------------------------------------
// fetchInquiryComments
// ---------------------------------------------------------------------------

describe('fetchInquiryComments', () => {
  it('fetches comments for the correct inquiry UUID', async () => {
    const comments = [makeComment(), makeComment({ id: 'comment-2' })]
    mockClient.get.mockResolvedValue(jsonResponse(comments))

    const result = await (
      fetchInquiryComments as (arg?: unknown) => Promise<Array<InquiryComment>>
    )({
      data: { id: TEST_UUID },
    })

    expect(mockClient.get).toHaveBeenCalledWith(
      `/v1/inquiries/${TEST_UUID}/comments`,
    )
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('comment-1')
  })
})

// ---------------------------------------------------------------------------
// submitInquiryComment
// ---------------------------------------------------------------------------

describe('submitInquiryComment', () => {
  it('posts to the correct endpoint with content and isInternal', async () => {
    const comment = makeComment({ content: 'Hello', isInternal: true })
    mockClient.post.mockResolvedValue(jsonResponse(comment))

    const result = await (
      submitInquiryComment as (arg?: unknown) => Promise<InquiryComment>
    )({
      data: { id: TEST_UUID, content: 'Hello', isInternal: true },
    })

    expect(mockClient.post).toHaveBeenCalledWith(
      `/v1/inquiries/${TEST_UUID}/comments`,
      { content: 'Hello', isInternal: true },
    )
    expect(result.content).toBe('Hello')
    expect(result.isInternal).toBe(true)
  })

  it('defaults isInternal to false', async () => {
    const comment = makeComment()
    mockClient.post.mockResolvedValue(jsonResponse(comment))

    await (submitInquiryComment as (arg?: unknown) => Promise<InquiryComment>)({
      data: { id: TEST_UUID, content: 'A comment', isInternal: false },
    })

    expect(mockClient.post).toHaveBeenCalledWith(
      `/v1/inquiries/${TEST_UUID}/comments`,
      { content: 'A comment', isInternal: false },
    )
  })
})
