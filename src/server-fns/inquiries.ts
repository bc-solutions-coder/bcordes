import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Inquiry, InquiryComment } from '@/lib/wallow/types'
import { createWallowClient } from '@/lib/wallow/client'
import { serviceClient } from '@/lib/wallow/service-client'
import { getSession } from '@/lib/auth/session'
import { requireAdmin } from '@/lib/auth/middleware'
import { STATUS_TO_API, STATUS_TO_FRONTEND } from '@/config/inquiries'

function normalizeInquiryStatus(inquiry: Inquiry): Inquiry {
  return {
    ...inquiry,
    status: STATUS_TO_FRONTEND[inquiry.status] ?? inquiry.status.toLowerCase(),
  }
}

const submitInquirySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  phone: z.string().max(100).default(''),
  company: z.string().optional(),
  projectType: z.enum(['Frontend', 'Full-Stack', 'Consulting', 'Other']),
  budgetRange: z.enum(['Under $5k', '$5k-$15k', '$15k-$50k', '$50k+']),
  timeline: z.enum(['Less than 1 month', '1-3 months', '3-6 months', '6+ months']),
  message: z.string().min(1).max(5000),
})

export const submitInquiry = createServerFn({ method: 'POST' })
  .inputValidator(submitInquirySchema)
  .handler(async ({ data }) => {
    const session = await getSession()

    if (session) {
      const client = await createWallowClient()
      const response = await client.post('/api/v1/inquiries', data)
      return normalizeInquiryStatus((await response.json()) as Inquiry)
    }

    const response = await serviceClient.post('/api/v1/inquiries', data)
    return normalizeInquiryStatus((await response.json()) as Inquiry)
  })

export const fetchInquiries = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAdmin()
    const client = await createWallowClient()
    const response = await client.get('/api/v1/inquiries')
    return ((await response.json()) as Array<Inquiry>).map(normalizeInquiryStatus)
  },
)

export const fetchMyInquiries = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getSession()
    const isAdmin = session?.user.roles.includes('admin') ?? false
    const client = await createWallowClient()
    const path = isAdmin ? '/api/v1/inquiries' : '/api/v1/inquiries/submitted'
    const response = await client.get(path)
    return ((await response.json()) as Array<Inquiry>).map(normalizeInquiryStatus)
  },
)

export const fetchInquiry = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    const response = await client.get(`/api/v1/inquiries/${data.id}`)
    return normalizeInquiryStatus((await response.json()) as Inquiry)
  })

export const updateInquiryStatus = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid(), status: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const client = await createWallowClient()
    const apiStatus = STATUS_TO_API[data.status] ?? data.status
    const response = await client.patch(`/api/v1/inquiries/${data.id}/status`, {
      newStatus: apiStatus,
    })
    return normalizeInquiryStatus((await response.json()) as Inquiry)
  })

export const fetchInquiryComments = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    const response = await client.get(`/api/v1/inquiries/${data.id}/comments`)
    return (await response.json()) as Array<InquiryComment>
  })

const submitInquiryCommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  isInternal: z.boolean().optional().default(false),
})

export const submitInquiryComment = createServerFn({ method: 'POST' })
  .inputValidator(submitInquiryCommentSchema)
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    const response = await client.post(
      `/api/v1/inquiries/${data.id}/comments`,
      { content: data.content, isInternal: data.isInternal },
    )
    return (await response.json()) as InquiryComment
  })
