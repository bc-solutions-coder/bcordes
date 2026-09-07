import { hasSessionReference } from '@bcordes/auth/session'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWallowSdk } from '@bc-solutions-coder/sdk'
import { createMockUser } from '@bcordes/auth/testing'
import {
  getAuthUser,
  requireAdmin,
  requireAuth,
} from '@bcordes/auth/middleware'
import { createWallowClient } from '@bcordes/wallow/client'
import { getInquiryService } from '@bcordes/wallow/service-client'
import {
  fetchInquiry,
  fetchInquiryComments,
  fetchMyInquiries,
  submitInquiry,
  submitInquiryComment,
  updateInquiryStatus,
} from './inquiries'
import type { InquiryResponse } from '@bc-solutions-coder/sdk'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = {
      inputValidator: () => builder,
      handler: (fn: unknown) => fn,
    }
    return builder
  },
}))
vi.mock('@bcordes/auth/session', () => ({ hasSessionReference: vi.fn() }))
vi.mock('@bcordes/auth/middleware', () => ({
  getAuthUser: vi.fn(),
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}))
vi.mock('@bcordes/wallow/client', () => ({ createWallowClient: vi.fn() }))
vi.mock('@bcordes/wallow/service-client', () => ({
  getInquiryService: vi.fn(),
}))

const id = '11111111-1111-4111-8111-111111111111'
const inquiry: InquiryResponse = {
  id,
  name: 'Test',
  email: 'test@example.com',
  phone: '',
  company: null,
  projectType: 'Other',
  budgetRange: 'Under $5k',
  timeline: '1-3 months',
  message: 'Hello',
  status: 'New',
  submitterId: 'test-user-123',
  createdAt: '',
  updatedAt: '',
}
const send = vi.fn<typeof fetch>()
beforeEach(() => {
  vi.resetAllMocks()
  const user = createMockUser({ permissions: ['InquiriesWrite'] })
  vi.mocked(requireAuth).mockResolvedValue(user)
  vi.mocked(getAuthUser).mockResolvedValue(user)
  vi.mocked(createWallowClient).mockResolvedValue(
    createWallowSdk({ baseUrl: 'https://app.example/api', fetch: send }),
  )
  send.mockImplementation(() => Promise.resolve(Response.json(inquiry)))
})

it('does not fall back to service credentials after session expiry', async () => {
  vi.mocked(getAuthUser).mockResolvedValue(null)
  vi.mocked(hasSessionReference).mockReturnValue(true)
  await expect(
    submitInquiry({
      data: {
        name: 'Test',
        email: 'test@example.com',
        phone: '',
        projectType: 'Other',
        budgetRange: 'Under $5k',
        timeline: '1-3 months',
        message: 'Hello',
      },
    }),
  ).rejects.toMatchObject({ status: 401 })
  expect(getInquiryService).not.toHaveBeenCalled()
})

describe('inquiry authorization through generated SDK operations', () => {
  it('allows a customer to read their inquiry', async () => {
    expect(await fetchInquiry({ data: { id } })).toMatchObject({
      id,
      status: 'new',
    })
  })
  it('denies another customer inquiry', async () => {
    send.mockResolvedValue(
      Response.json({ ...inquiry, submitterId: 'someone-else' }),
    )
    await expect(fetchInquiry({ data: { id } })).rejects.toMatchObject({
      status: 404,
    })
  })
  it('does not let an anonymous inquiry be claimed by matching email', async () => {
    send.mockResolvedValue(Response.json({ ...inquiry, submitterId: null }))
    await expect(fetchInquiry({ data: { id } })).rejects.toMatchObject({
      status: 404,
    })
  })
  it('allows API-authorized staff to read organization inquiries', async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      createMockUser({ permissions: ['InquiriesRead'] }),
    )
    send.mockResolvedValue(
      Response.json({ ...inquiry, submitterId: 'another-user' }),
    )
    expect(await fetchInquiry({ data: { id } })).toMatchObject({ id })
  })
  it('uses the customer submitted endpoint', async () => {
    send.mockResolvedValue(Response.json([inquiry]))
    await fetchMyInquiries()
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      url: 'https://app.example/api/v1/inquiries/submitted',
    })
  })
  it('removes internal comments before returning them to a customer', async () => {
    send.mockResolvedValueOnce(Response.json(inquiry)).mockResolvedValueOnce(
      Response.json([
        { id: 'public', isInternal: false },
        { id: 'private', isInternal: true },
      ]),
    )
    expect(await fetchInquiryComments({ data: { id } })).toEqual([
      { id: 'public', isInternal: false },
    ])
  })
  it('rejects customer internal comments without sending a mutation', async () => {
    await expect(
      submitInquiryComment({
        data: { id, content: 'secret', isInternal: true },
      }),
    ).rejects.toMatchObject({ status: 403 })
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('rejects status changes before invoking the API when staff authorization fails', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Response('Forbidden', { status: 403 }),
    )
    await expect(
      updateInquiryStatus({ data: { id, status: 'closed' } }),
    ).rejects.toMatchObject({ status: 403 })
    expect(send).not.toHaveBeenCalled()
  })
  it('preserves user identity for signed-in submission and supplies nullable company', async () => {
    await submitInquiry({
      data: {
        name: 'Test',
        email: 'test@example.com',
        phone: '',
        projectType: 'Other',
        budgetRange: 'Under $5k',
        timeline: '1-3 months',
        message: 'Hello',
      },
    })
    expect(getInquiryService).not.toHaveBeenCalled()
    const request = send.mock.calls[0]?.[0]
    expect(request).toBeInstanceOf(Request)
    if (request instanceof Request)
      expect(await request.json()).toMatchObject({ company: null })
  })
})
