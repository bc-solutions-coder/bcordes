import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  inquiriesAddComment,
  inquiriesGetAll,
  inquiriesGetById,
  inquiriesGetComments,
  inquiriesGetSubmitted,
  inquiriesSubmit,
  inquiriesUpdateStatus,
} from '@bc-solutions-coder/sdk'
import {
  getAuthUser,
  requireAdmin,
  requireAuth,
} from '@bcordes/auth/middleware'
import { createWallowClient } from '@bcordes/wallow/client'
import { hasSessionReference } from '@bcordes/auth/session'
import { getInquiryService } from '@bcordes/wallow/service-client'
import { STATUS_TO_API, STATUS_TO_FRONTEND } from '../lib/inquiries'
import type { InquiryResponse } from '@bc-solutions-coder/sdk'

function normalizeInquiryStatus(inquiry: InquiryResponse): InquiryResponse {
  return {
    ...inquiry,
    status: STATUS_TO_FRONTEND[inquiry.status] ?? inquiry.status.toLowerCase(),
  }
}

async function accessibleInquiry(id: string) {
  const user = await requireAuth()
  const sdk = await createWallowClient()
  const inquiry = await inquiriesGetById({ client: sdk.client, path: { id } })
  const staff = user.permissions.includes('InquiriesRead')
  if (!staff && inquiry.submitterId !== user.id)
    throw new Response('Not found', { status: 404 })
  return { sdk, inquiry, staff }
}

const submitInquirySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email().max(254),
  phone: z.string().max(100).default(''),
  company: z.string().optional(),
  projectType: z.enum(['Frontend', 'Full-Stack', 'Consulting', 'Other']),
  budgetRange: z.enum(['Under $5k', '$5k-$15k', '$15k-$50k', '$50k+']),
  timeline: z.enum([
    'Less than 1 month',
    '1-3 months',
    '3-6 months',
    '6+ months',
  ]),
  message: z.string().min(1).max(5000),
})

export const submitInquiry = createServerFn({ method: 'POST' })
  .inputValidator(submitInquirySchema)
  .handler(async ({ data }) => {
    const user = await getAuthUser()
    if (!user && hasSessionReference())
      throw new Response('Sign in again before submitting', { status: 401 })
    const sdk = user ? await createWallowClient() : getInquiryService()
    return inquiriesSubmit({
      client: sdk.client,
      body: { ...data, company: data.company ?? null },
    })
  })

export const fetchInquiries = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAdmin()
    const sdk = await createWallowClient()
    return (await inquiriesGetAll({ client: sdk.client })).map(
      normalizeInquiryStatus,
    )
  },
)

export const fetchMyInquiries = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth()
    const sdk = await createWallowClient()
    const inquiries = user.permissions.includes('InquiriesRead')
      ? await inquiriesGetAll({ client: sdk.client })
      : await inquiriesGetSubmitted({ client: sdk.client })
    return inquiries.map(normalizeInquiryStatus)
  },
)

export const fetchInquiry = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) =>
    normalizeInquiryStatus((await accessibleInquiry(data.id)).inquiry),
  )

export const updateInquiryStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.uuid(),
      status: z.enum(['new', 'reviewed', 'contacted', 'closed']),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const sdk = await createWallowClient()
    await inquiriesUpdateStatus({
      client: sdk.client,
      path: { id: data.id },
      body: { newStatus: STATUS_TO_API[data.status] },
    })
  })

export const fetchInquiryComments = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const { sdk, staff } = await accessibleInquiry(data.id)
    const comments = await inquiriesGetComments({
      client: sdk.client,
      path: { id: data.id },
    })
    return staff ? comments : comments.filter((comment) => !comment.isInternal)
  })

export const submitInquiryComment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.uuid(),
      content: z.string().min(1).max(5000),
      isInternal: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => {
    const { sdk, staff } = await accessibleInquiry(data.id)
    if (data.isInternal && !staff)
      throw new Response('Forbidden', { status: 403 })
    return inquiriesAddComment({
      client: sdk.client,
      path: { id: data.id },
      body: { content: data.content, isInternal: data.isInternal },
    })
  })
