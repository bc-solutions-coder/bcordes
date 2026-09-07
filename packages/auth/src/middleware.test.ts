import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWallowSdk } from '@bc-solutions-coder/sdk'
import { createMockSession } from './testing'
import { getAuthUser, requireAdmin, requireAuth } from './middleware'
import { getSession } from './session'
import { createRequestSdk } from './sdk'

vi.mock('./session', () => ({ getSession: vi.fn() }))
vi.mock('./sdk', () => ({ createRequestSdk: vi.fn() }))

beforeEach(() => vi.resetAllMocks())

function profile(body: unknown, status = 200) {
  vi.mocked(createRequestSdk).mockResolvedValue(
    createWallowSdk({
      baseUrl: 'https://app.example/api',
      fetch: () => Promise.resolve(Response.json(body, { status })),
    }),
  )
}

describe('SDK identity adapter', () => {
  it('returns null without a session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    expect(await getAuthUser()).toBeNull()
    expect(createRequestSdk).not.toHaveBeenCalled()
  })
  it('uses API-expanded permissions instead of session scopes', async () => {
    vi.mocked(getSession).mockResolvedValue(
      createMockSession({
        user: {
          sub: 'test-user-123',
          organizationId: 'org',
          permissions: ['inquiries.read'],
        },
      }),
    )
    profile({
      id: 'test-user-123',
      firstName: 'Test',
      permissions: ['InquiriesRead'],
    })
    expect(await getAuthUser()).toMatchObject({
      id: 'test-user-123',
      tenantId: 'org',
      permissions: ['InquiriesRead'],
    })
  })
  it('rejects a profile belonging to another session user', async () => {
    vi.mocked(getSession).mockResolvedValue(createMockSession())
    profile({ id: 'another-user' })
    expect(await getAuthUser()).toBeNull()
  })
  it('treats an expired SDK session as signed out', async () => {
    vi.mocked(getSession).mockResolvedValue(createMockSession())
    profile({ code: 'unauthorized' }, 401)
    expect(await getAuthUser()).toBeNull()
  })
  it('redirects unauthenticated navigation to SDK login', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    await expect(requireAuth('/dashboard/inquiries')).rejects.toMatchObject({
      options: { href: '/bff/login?returnTo=%2Fdashboard%2Finquiries' },
    })
  })
  it('denies staff access when an admin role lacks the API capability', async () => {
    vi.mocked(getSession).mockResolvedValue(createMockSession())
    profile({
      id: 'test-user-123',
      roles: ['admin'],
      permissions: ['InquiriesWrite'],
    })
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  })
})
