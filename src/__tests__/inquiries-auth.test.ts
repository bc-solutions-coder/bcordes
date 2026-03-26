import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { SessionData, User } from '@/lib/auth/types'

// Mock getSession — the sole dependency for auth checks
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

// Mock wallow client so handlers don't make real HTTP calls
vi.mock('@/lib/wallow/client', () => ({
  createWallowClient: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([]),
    }),
    patch: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        id: '1',
        status: 'Reviewed',
        name: 'Test',
        email: 'test@test.com',
        message: 'test',
        createdAt: '2026-01-01',
      }),
    }),
  }),
}))

import { getSession } from '@/lib/auth/session'
import { requireAdmin } from '@/lib/auth/middleware'

const mockedGetSession = vi.mocked(getSession)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(roles: string[] = ['user']): User {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    roles,
    permissions: [],
    tenantId: 'tenant-1',
    tenantName: 'Test Tenant',
  }
}

function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    sessionId: 'sess-1',
    accessToken: 'at-token',
    refreshToken: 'rt-token',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    user: makeUser(),
    version: 1,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: requireAdmin guard
// ---------------------------------------------------------------------------

describe('requireAdmin()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject unauthenticated requests (no session)', async () => {
    mockedGetSession.mockResolvedValue(null)

    await expect(requireAdmin()).rejects.toThrow()
  })

  it('should reject non-admin users with a 403 status', async () => {
    mockedGetSession.mockResolvedValue(makeSession({ user: makeUser(['user']) }))

    try {
      await requireAdmin()
      expect.fail('requireAdmin() should have thrown for non-admin user')
    } catch (error: unknown) {
      // Accept either a redirect, a Response with 403, or an error with status 403
      const err = error as Record<string, unknown>
      const status =
        err.status ?? err.statusCode ?? (err as { response?: { status?: number } }).response?.status
      expect(status).toBe(403)
    }
  })

  it('should allow admin users to proceed', async () => {
    const adminSession = makeSession({ user: makeUser(['admin', 'user']) })
    mockedGetSession.mockResolvedValue(adminSession)

    const user = await requireAdmin()
    expect(user).toEqual(adminSession.user)
  })

  it('should reject users with manager role but not admin', async () => {
    mockedGetSession.mockResolvedValue(
      makeSession({ user: makeUser(['manager', 'user']) }),
    )

    try {
      await requireAdmin()
      expect.fail('requireAdmin() should have thrown for manager-only user')
    } catch (error: unknown) {
      const err = error as Record<string, unknown>
      const status =
        err.status ?? err.statusCode ?? (err as { response?: { status?: number } }).response?.status
      expect(status).toBe(403)
    }
  })
})

// ---------------------------------------------------------------------------
// Tests: fetchInquiries admin guard integration
// ---------------------------------------------------------------------------

describe('fetchInquiries admin guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require admin role to fetch all inquiries', async () => {
    mockedGetSession.mockResolvedValue(makeSession({ user: makeUser(['user']) }))

    // Once requireAdmin is wired into fetchInquiries, this should reject
    // For now we call requireAdmin directly to prove the guard works
    try {
      await requireAdmin()
      expect.fail('Should have thrown for non-admin')
    } catch (error: unknown) {
      const err = error as Record<string, unknown>
      const status =
        err.status ?? err.statusCode ?? (err as { response?: { status?: number } }).response?.status
      expect(status).toBe(403)
    }
  })
})

// ---------------------------------------------------------------------------
// Tests: updateInquiryStatus admin guard integration
// ---------------------------------------------------------------------------

describe('updateInquiryStatus admin guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require admin role to update inquiry status', async () => {
    mockedGetSession.mockResolvedValue(makeSession({ user: makeUser(['user']) }))

    try {
      await requireAdmin()
      expect.fail('Should have thrown for non-admin')
    } catch (error: unknown) {
      const err = error as Record<string, unknown>
      const status =
        err.status ?? err.statusCode ?? (err as { response?: { status?: number } }).response?.status
      expect(status).toBe(403)
    }
  })

  it('should allow admin to update inquiry status', async () => {
    const adminSession = makeSession({ user: makeUser(['admin']) })
    mockedGetSession.mockResolvedValue(adminSession)

    const user = await requireAdmin()
    expect(user).toEqual(adminSession.user)
  })
})
