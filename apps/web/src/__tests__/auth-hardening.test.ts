// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionData, User } from '@/lib/auth/types'

import { getAuthUser } from '@/lib/auth/middleware'

// ---------------------------------------------------------------------------
// Hoisted mocks for getAuthUser tests (session + oidc)
// ---------------------------------------------------------------------------

const {
  mockGetSession,
  mockSetSession,
  mockClearSession,
  mockRefreshToken,
  mockFetchUserProfile,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSetSession: vi.fn(),
  mockClearSession: vi.fn(),
  mockRefreshToken: vi.fn(),
  mockFetchUserProfile: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
  setSession: mockSetSession,
  clearSession: mockClearSession,
}))

vi.mock('@/lib/auth/oidc', () => ({
  refreshToken: mockRefreshToken,
  fetchUserProfile: mockFetchUserProfile,
}))

vi.mock('@/lib/valkey', () => ({
  getValkey: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  })),
  keys: {
    session: (id: string) => 'bcordes:session:' + id,
    sessionLock: (id: string) => 'bcordes:lock:session:' + id,
    serviceToken: () => 'bcordes:service-token',
    serviceTokenLock: () => 'bcordes:lock:service-token',
    oidcConfig: () => 'bcordes:oidc-config',
  },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  roles: ['user'],
  permissions: [],
  tenantId: 'tenant-1',
  tenantName: 'Test Tenant',
}

const refreshedUser: User = {
  ...fakeUser,
  name: 'Refreshed User',
}

function expiredSession(overrides?: Partial<SessionData>): SessionData {
  return {
    sessionId: 'sess-1',
    accessToken: 'old-at',
    refreshToken: 'old-rt',
    expiresAt: Math.floor(Date.now() / 1000) - 60, // expired 60 s ago
    user: fakeUser,
    version: 1,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. getAuthUser — token refresh behaviour
// ---------------------------------------------------------------------------

describe('Auth Hardening — getAuthUser token refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears the session and returns null when token refresh throws', async () => {
    mockGetSession.mockResolvedValue(expiredSession())
    mockRefreshToken.mockRejectedValue(new Error('refresh_grant failed'))

    const result = await getAuthUser()

    // Requirement 1: on refresh failure, clearSession must be called and null returned
    expect(mockClearSession).toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('returns updated user after a successful token refresh', async () => {
    mockGetSession.mockResolvedValue(expiredSession())
    mockRefreshToken.mockResolvedValue({
      accessToken: 'new-at',
      refreshToken: 'new-rt',
      idToken: '',
      expiresIn: 3600,
      subject: 'user-1',
    })
    mockFetchUserProfile.mockResolvedValue(refreshedUser)

    const result = await getAuthUser()

    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        user: refreshedUser,
        version: 2,
      }),
    )
    expect(result).toEqual(refreshedUser)
  })
})

// ---------------------------------------------------------------------------
// 2. OIDC getConfig — env var validation
// ---------------------------------------------------------------------------

describe('Auth Hardening — OIDC getConfig validation', () => {
  it('throws a descriptive error when OIDC_CLIENT_ID is not set', async () => {
    vi.resetModules()
    // Remove the vi.mock for oidc so we get the real module
    vi.doUnmock('@/lib/auth/oidc')

    const saved = { ...process.env }
    process.env.OIDC_ISSUER = 'https://auth.example.com'
    process.env.OIDC_CLIENT_ID = ''
    process.env.OIDC_REDIRECT_URI = 'https://app.example.com/auth/callback'
    process.env.SESSION_SECRET = 'a]zV-*M8WG#aNrqd,1>dC&.7[Px4bxgf'

    try {
      const oidc = await import('@/lib/auth/oidc')
      const state = oidc.randomState()
      const verifier = oidc.randomPKCECodeVerifier()
      // getConfig() is called internally — should throw because OIDC_CLIENT_ID is empty
      await expect(oidc.getAuthorizationUrl(state, verifier)).rejects.toThrow(
        /OIDC_CLIENT_ID/i,
      )
    } finally {
      process.env = saved
    }
  })

  it('throws a descriptive error when OIDC_REDIRECT_URI is not set', async () => {
    vi.resetModules()
    vi.doUnmock('@/lib/auth/oidc')

    const saved = { ...process.env }
    process.env.OIDC_ISSUER = 'https://auth.example.com'
    process.env.OIDC_CLIENT_ID = 'my-client'
    process.env.OIDC_REDIRECT_URI = ''
    process.env.SESSION_SECRET = 'a]zV-*M8WG#aNrqd,1>dC&.7[Px4bxgf'

    try {
      const oidc = await import('@/lib/auth/oidc')
      const state = oidc.randomState()
      const verifier = oidc.randomPKCECodeVerifier()
      await expect(oidc.getAuthorizationUrl(state, verifier)).rejects.toThrow(
        /OIDC_REDIRECT_URI/i,
      )
    } finally {
      process.env = saved
    }
  })
})

// ---------------------------------------------------------------------------
// 3. Session cookie — Max-Age attribute
// ---------------------------------------------------------------------------

describe('Auth Hardening — session cookie Max-Age', () => {
  it('includes Max-Age=86400 in the Set-Cookie header value', async () => {
    vi.resetModules()
    vi.doUnmock('@/lib/auth/session')

    const saved = { ...process.env }
    process.env.SESSION_SECRET = 'a]zV-*M8WG#aNrqd,1>dC&.7[Px4bxgf'

    try {
      const { sealSessionCookie } = await import('@/lib/auth/session')

      const data: SessionData = {
        sessionId: 'sess-cookie-test',
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        user: fakeUser,
        version: 1,
      }

      const cookie = await sealSessionCookie(data)

      // Requirement 2: cookie string must contain Max-Age=86400
      expect(cookie).toContain('Max-Age=86400')
    } finally {
      process.env = saved
    }
  })
})
