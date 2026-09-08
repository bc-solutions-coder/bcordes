import { ZodError } from 'zod'
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
  fetchInquiries,
  fetchInquiry,
  fetchInquiryComments,
  fetchMyInquiries,
  submitInquiry,
  submitInquiryComment,
  updateInquiryStatus,
} from './inquiries'
import type { InquiryResponse } from '@bc-solutions-coder/sdk'

vi.mock(
  '@tanstack/react-start',
  () => import('../../../../testing/server-functions'),
)
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

const id = '550e8400-e29b-41d4-a716-446655440000'
const submission = {
  name: 'Alice',
  email: 'alice@example.com',
  phone: '',
  projectType: 'Other',
  budgetRange: 'Under $5k',
  timeline: '1-3 months',
  message: 'Hello',
} satisfies Parameters<typeof submitInquiry>[0]['data']
const inquiry: InquiryResponse = {
  ...submission,
  id,
  company: null,
  status: 'New',
  submitterId: 'test-user-123',
  createdAt: '',
  updatedAt: '',
}
const send = vi.fn<typeof fetch>()
const serviceSend = vi.fn<typeof fetch>()
const statuses = [
  { api: 'New', ui: 'new' },
  { api: 'Reviewed', ui: 'reviewed' },
  { api: 'Contacted', ui: 'contacted' },
  { api: 'Closed', ui: 'closed' },
]

beforeEach(() => {
  vi.resetAllMocks()
  const user = createMockUser({ permissions: ['InquiriesWrite'] })
  vi.mocked(requireAuth).mockResolvedValue(user)
  vi.mocked(requireAdmin).mockResolvedValue(user)
  vi.mocked(getAuthUser).mockResolvedValue(user)
  const authenticated = createWallowSdk({
    baseUrl: 'https://app.example/api',
    fetch: send,
  })
  authenticated.client.setConfig({
    headers: { Authorization: 'Bearer user-fixture' },
  })
  vi.mocked(createWallowClient).mockResolvedValue(authenticated)
  const service = createWallowSdk({
    baseUrl: 'https://app.example/api',
    fetch: serviceSend,
  })
  service.client.setConfig({
    headers: { Authorization: 'Bearer service-fixture' },
  })
  vi.mocked(getInquiryService).mockReturnValue({
    ...service,
    accessToken: () => Promise.resolve('service-fixture'),
  })
  send.mockImplementation(() => Promise.resolve(Response.json(inquiry)))
  serviceSend.mockImplementation(() => Promise.resolve(Response.json(inquiry)))
})

function requests() {
  return send.mock.calls.map(([request]) => {
    if (!(request instanceof Request))
      throw new Error('SDK did not produce a Request')
    return request
  })
}
async function expectMutation(path: string, body: unknown, method = 'POST') {
  const writes = requests().filter((request) => request.method !== 'GET')
  expect(writes).toHaveLength(1)
  expect(writes[0].method).toBe(method)
  expect(writes[0].url).toBe(`https://app.example/api${path}`)
  expect(writes[0].headers.get('authorization')).toBe('Bearer user-fixture')
  expect(await writes[0].clone().json()).toEqual(body)
}

it('does not fall back to service credentials after session expiry', async () => {
  vi.mocked(getAuthUser).mockResolvedValue(null)
  vi.mocked(hasSessionReference).mockReturnValue(true)
  await expect(submitInquiry({ data: submission })).rejects.toMatchObject({
    status: 401,
  })
  expect(send).not.toHaveBeenCalled()
  expect(serviceSend).not.toHaveBeenCalled()
})

describe('Inquiry access and status requests', () => {
  it.each(statuses)(
    'returns an owned inquiry with $api normalized to $ui',
    async ({ api, ui }) => {
      send.mockResolvedValue(Response.json({ ...inquiry, status: api }))
      expect(await fetchInquiry({ data: { id } })).toMatchObject({
        id,
        status: ui,
      })
      expect(
        requests().map((request) => [request.method, request.url]),
      ).toEqual([['GET', `https://app.example/api/v1/inquiries/${id}`]])
    },
  )
  it('lowercases an unrecognized inbound status', async () => {
    send.mockResolvedValue(
      Response.json({ ...inquiry, status: 'Future_Status' }),
    )
    expect(await fetchInquiry({ data: { id } })).toMatchObject({
      status: 'future_status',
    })
  })
  it('hides another customer’s inquiry with a not-found response', async () => {
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
  it('allows staff with inquiry-read permission to read another user’s inquiry', async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      createMockUser({ roles: ['customer'], permissions: ['InquiriesRead'] }),
    )
    send.mockResolvedValue(
      Response.json({ ...inquiry, submitterId: 'another-user' }),
    )
    expect(await fetchInquiry({ data: { id } })).toMatchObject({ id })
  })
  it.each([
    { staff: false, path: '/v1/inquiries/submitted', name: 'My submission' },
    { staff: true, path: '/v1/inquiries', name: 'Organization inquiry' },
  ])(
    'returns $name from $path with normalized status',
    async ({ staff, path, name }) => {
      vi.mocked(requireAuth).mockResolvedValue(
        createMockUser({ permissions: staff ? ['InquiriesRead'] : [] }),
      )
      send.mockImplementation((input) => {
        if (!(input instanceof Request)) throw new Error('Expected request')
        const submitted = new URL(input.url).pathname.endsWith('/submitted')
        return Promise.resolve(
          Response.json([
            {
              ...inquiry,
              name: submitted ? 'My submission' : 'Organization inquiry',
              status: 'Reviewed',
            },
          ]),
        )
      })
      expect(await fetchMyInquiries()).toEqual([
        { ...inquiry, name, status: 'reviewed' },
      ])
      expect(
        requests().map((request) => [request.method, request.url]),
      ).toEqual([['GET', `https://app.example/api${path}`]])
    },
  )
  it('loads the organization list after staff authorization', async () => {
    send.mockResolvedValue(Response.json([{ ...inquiry, status: 'Closed' }]))
    expect(await fetchInquiries()).toEqual([{ ...inquiry, status: 'closed' }])
    expect(requests().map((request) => [request.method, request.url])).toEqual([
      ['GET', 'https://app.example/api/v1/inquiries'],
    ])
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
    expect(requests().map((request) => [request.method, request.url])).toEqual([
      ['GET', `https://app.example/api/v1/inquiries/${id}`],
    ])
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
  it.each(statuses)(
    'sends $ui as $api for the authorized inquiry status change',
    async ({ ui, api }) => {
      await Reflect.apply(updateInquiryStatus, undefined, [
        { data: { id, status: ui } },
      ])
      await expectMutation(
        `/v1/inquiries/${id}/status`,
        { newStatus: api },
        'PATCH',
      )
    },
  )
  it.each([undefined, 'Client company'])(
    'submits through the signed-in client with company %s',
    async (company) => {
      await submitInquiry({ data: { ...submission, company } })
      await expectMutation('/v1/inquiries', {
        ...submission,
        company: company ?? null,
      })
      expect(requests()[0].method).toBe('POST')
      expect(serviceSend).not.toHaveBeenCalled()
    },
  )
  it('submits anonymously through the service client', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    await submitInquiry({ data: submission })
    expect(send).not.toHaveBeenCalled()
    const request = serviceSend.mock.calls[0]?.[0]
    if (!(request instanceof Request))
      throw new Error('Service request missing')
    expect(request.method).toBe('POST')
    expect(request.url).toBe('https://app.example/api/v1/inquiries')
    expect(request.headers.get('authorization')).toBe('Bearer service-fixture')
    expect(await request.json()).toEqual({ ...submission, company: null })
  })
})

describe('Registered inquiry validation', () => {
  for (const [field, values] of [
    ['projectType', ['Frontend', 'Full-Stack', 'Consulting', 'Other']],
    ['budgetRange', ['Under $5k', '$5k-$15k', '$15k-$50k', '$50k+']],
    [
      'timeline',
      ['Less than 1 month', '1-3 months', '3-6 months', '6+ months'],
    ],
  ] satisfies Array<[string, Array<string>]>) {
    it.each(values)(
      `submits ${field} %s through its registered validator`,
      async (value) => {
        const data = { ...submission, [field]: value }
        await Reflect.apply(submitInquiry, undefined, [{ data }])
        await expectMutation('/v1/inquiries', { ...data, company: null })
      },
    )
  }
  it.each([
    ['projectType', 'random-value'],
    ['budgetRange', 'one-million-dollars'],
    ['timeline', 'whenever'],
    ['name', ''],
    ['name', 'a'.repeat(201)],
    ['email', 'not-an-email'],
    ['email', 'a'.repeat(243) + '@example.com'],
    ['phone', '1'.repeat(101)],
    ['message', ''],
    ['message', 'a'.repeat(5001)],
  ])('rejects invalid %s before any request', async (field, value) => {
    await expect(
      Reflect.apply(submitInquiry, undefined, [
        { data: { ...submission, [field]: value } },
      ]),
    ).rejects.toBeInstanceOf(ZodError)
    expect(send).not.toHaveBeenCalled()
    expect(serviceSend).not.toHaveBeenCalled()
  })
  it.each([
    ['name', 'a'.repeat(200)],
    ['phone', '1'.repeat(100)],
    ['message', 'a'.repeat(5000)],
  ])(
    'preserves the maximum supported %s in the request',
    async (field, value) => {
      const data = { ...submission, [field]: value }
      await Reflect.apply(submitInquiry, undefined, [{ data }])
      await expectMutation('/v1/inquiries', { ...data, company: null })
    },
  )
  it.each([
    { name: 'fetchInquiry', operation: fetchInquiry, fields: {} },
    {
      name: 'fetchInquiryComments',
      operation: fetchInquiryComments,
      fields: {},
    },
    {
      name: 'updateInquiryStatus',
      operation: updateInquiryStatus,
      fields: { status: 'new' },
    },
    {
      name: 'submitInquiryComment',
      operation: submitInquiryComment,
      fields: { content: 'test' },
    },
  ])(
    'rejects malformed UUIDs in $name before any request',
    async ({ operation, fields }) => {
      await expect(
        Reflect.apply(operation, undefined, [
          { data: { ...fields, id: 'not-a-uuid' } },
        ]),
      ).rejects.toBeInstanceOf(ZodError)
      expect(send).not.toHaveBeenCalled()
    },
  )
  it('rejects unsupported inquiry statuses before any request', async () => {
    await expect(
      Reflect.apply(updateInquiryStatus, undefined, [
        { data: { id, status: 'unsupported' } },
      ]),
    ).rejects.toBeInstanceOf(ZodError)
    expect(send).not.toHaveBeenCalled()
  })
  it.each(['', 'a'.repeat(5001)])(
    'rejects an invalid comment length before any request',
    async (content) => {
      await expect(
        submitInquiryComment({ data: { id, content } }),
      ).rejects.toBeInstanceOf(ZodError)
      expect(send).not.toHaveBeenCalled()
    },
  )
  it.each(['test', 'a'.repeat(5000)])(
    'submits a public comment within the supported length',
    async (content) => {
      await submitInquiryComment({ data: { id, content } })
      await expectMutation(`/v1/inquiries/${id}/comments`, {
        content,
        isInternal: false,
      })
    },
  )
})
