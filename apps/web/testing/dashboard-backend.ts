import { createWallowSdk } from '@bc-solutions-coder/sdk'
import { z } from 'zod'
import { createMockSession, createMockUser } from '@bcordes/auth/testing'
import type { User } from '@bcordes/auth/types'
import type {
  Inquiry,
  InquiryComment,
  Notification,
  NotificationSettings,
} from '@bcordes/wallow/types'

export const firstInquiryId = '550e8400-e29b-41d4-a716-446655440000'
export const secondInquiryId = '550e8400-e29b-41d4-a716-446655440001'

export function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: firstInquiryId,
    name: 'Alice',
    email: 'alice@example.com',
    phone: '555-1234',
    company: 'Acme',
    projectType: 'fullstack',
    budgetRange: '$5k-$15k',
    timeline: '1-3 months',
    message: 'A new website',
    status: 'New',
    submitterId: 'test-user-123',
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-01-15T10:30:00Z',
    ...overrides,
  }
}

export function makeComment(
  overrides: Partial<InquiryComment> = {},
): InquiryComment {
  return {
    id: firstInquiryId,
    inquiryId: firstInquiryId,
    authorName: 'Support',
    authorId: 'staff',
    content: 'We can help',
    isInternal: false,
    createdAt: '2026-01-16T10:30:00Z',
    ...overrides,
  }
}

export function makeNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: firstInquiryId,
    userId: 'test-user-123',
    type: 'InquirySubmitted',
    title: 'Website inquiry',
    message: 'Alice sent a new inquiry',
    isRead: false,
    readAt: null,
    actionUrl: `/dashboard/inquiries/${firstInquiryId}`,
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-01-15T10:30:00Z',
    ...overrides,
  }
}

interface DashboardBackend {
  user: User
  signedIn: boolean
  inquiries: Array<Inquiry>
  comments: Array<InquiryComment>
  settings: Array<NotificationSettings>
  notifications: Array<Notification>
  unreadCount: number
  requests: Array<Request>
  intercept?: (request: Request) => Promise<Response | undefined>
}

function initialState(): DashboardBackend {
  return {
    user: createMockUser({ permissions: ['InquiriesWrite'] }),
    signedIn: true,
    inquiries: [makeInquiry()],
    comments: [],
    notifications: [makeNotification()],
    unreadCount: 1,
    settings: [
      { channelType: 0, isEnabled: true },
      { channelType: 1, isEnabled: false },
      { channelType: 2, isEnabled: true },
    ] satisfies Array<NotificationSettings>,
    requests: [],
    intercept: undefined,
  }
}

export const backend = initialState()
export function resetBackend() {
  Object.assign(backend, initialState())
}

export function getSession() {
  return backend.signedIn
    ? createMockSession({ user: { sub: backend.user.id } })
    : null
}
export function hasSessionReference() {
  return backend.signedIn
}

async function respond(input: RequestInfo | URL): Promise<Response> {
  if (!(input instanceof Request)) throw new Error('Expected an SDK Request')
  backend.requests.push(input.clone())
  const intercepted = await backend.intercept?.(input.clone())
  if (intercepted) return intercepted
  const path = new URL(input.url).pathname
  if (path === '/v1/identity/users/me') {
    return Response.json({ ...backend.user, firstName: backend.user.name })
  }
  if (path === '/v1/notifications' && input.method === 'GET') {
    return Response.json({ items: backend.notifications, totalCount: 80 })
  }
  if (path === '/v1/notifications/unread-count' && input.method === 'GET') {
    return Response.json({ count: backend.unreadCount })
  }
  if (path === '/v1/notifications/read-all' && input.method === 'POST') {
    backend.notifications = backend.notifications.map((notification) => ({
      ...notification,
      isRead: true,
    }))
    backend.unreadCount = 0
    return new Response(null, { status: 204 })
  }
  const notification = backend.notifications.find(
    (item) => path === `/v1/notifications/${item.id}/read`,
  )
  if (notification && input.method === 'POST') {
    if (!notification.isRead) backend.unreadCount -= 1
    notification.isRead = true
    return new Response(null, { status: 204 })
  }
  if (path === '/v1/inquiries' || path === '/v1/inquiries/submitted') {
    return Response.json(backend.inquiries)
  }
  const inquiry = backend.inquiries.find(
    (item) =>
      path === `/v1/inquiries/${item.id}` ||
      path.startsWith(`/v1/inquiries/${item.id}/`),
  )
  if (inquiry) {
    if (path.endsWith('/status') && input.method === 'PATCH') {
      const body = z.object({ newStatus: z.string() }).parse(await input.json())
      inquiry.status = body.newStatus
      return new Response(null, { status: 204 })
    }
    if (path.endsWith('/comments')) {
      if (input.method === 'POST') {
        const body = z
          .object({ content: z.string(), isInternal: z.boolean() })
          .parse(await input.json())
        const comment = makeComment({
          ...body,
          id: secondInquiryId,
          inquiryId: inquiry.id,
        })
        backend.comments.push(comment)
        return Response.json(comment)
      }
      return Response.json(
        backend.comments.filter((comment) => comment.inquiryId === inquiry.id),
      )
    }
    if (input.method === 'GET') return Response.json(inquiry)
  }
  if (path === '/v1/notification-settings' && input.method === 'GET') {
    return Response.json({
      channelSettings: backend.settings.map((setting) => ({
        channelType: setting.channelType,
        isGloballyEnabled: setting.isEnabled,
      })),
    })
  }
  if (path === '/v1/notification-settings/channel' && input.method === 'PUT') {
    const setting = z
      .object({ channelType: z.number().int(), isEnabled: z.boolean() })
      .parse(await input.json())
    backend.settings = [
      ...backend.settings.filter(
        (item) => item.channelType !== setting.channelType,
      ),
      setting,
    ]
    return new Response(null, { status: 204 })
  }
  throw new Error(`Unexpected dashboard request: ${input.method} ${path}`)
}

export function createWallowClient() {
  return createWallowSdk({
    baseUrl: 'https://dashboard.example',
    fetch: respond,
  })
}
export const createRequestSdk = createWallowClient

export function pauseRequest(method: string, path: string) {
  let resolve!: (value: Response | undefined) => void
  const promise = new Promise<Response | undefined>((accept) => {
    resolve = accept
  })
  backend.intercept = (request) =>
    request.method === method && new URL(request.url).pathname === path
      ? promise
      : Promise.resolve(undefined)
  return { resolve }
}
