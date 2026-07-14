import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthUser, requireAdmin, requireAuth } from './middleware'
import { createMockSession, createMockUser } from '@/test/mocks/auth'

import { clearSession, getSession, setSession } from '@/lib/auth/session'
import { fetchUserProfile, refreshToken } from '@/lib/auth/oidc'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/logger', () => {
  const child = () => mockLogger
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child,
  }
  return { default: mockLogger }
})

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
}))

vi.mock('@/lib/auth/oidc', () => ({
  refreshToken: vi.fn(),
  fetchUserProfile: vi.fn(),
}))

const mockGetSession = vi.mocked(getSession)
const mockSetSession = vi.mocked(setSession)
const mockClearSession = vi.mocked(clearSession)
const mockRefreshToken = vi.mocked(refreshToken)
const mockFetchUserProfile = vi.mocked(fetchUserProfile)

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getAuthUser
// ---------------------------------------------------------------------------

describe('getAuthUser', () => {
  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await getAuthUser()

    expect(result).toBeNull()
  })

  it('returns session.user when token is not expired', async () => {
    const session = createMockSession({
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    })
    mockGetSession.mockResolvedValue(session)

    const result = await getAuthUser()

    expect(result).toEqual(session.user)
    expect(mockRefreshToken).not.toHaveBeenCalled()
  })

  it('returns session.user when refreshToken is absent even if expired', async () => {
    const session = createMockSession({
      expiresAt: Math.floor(Date.now() / 1000) - 60,
      refreshToken: undefined,
    })
    mockGetSession.mockResolvedValue(session)

    const result = await getAuthUser()

    expect(result).toEqual(session.user)
    expect(mockRefreshToken).not.toHaveBeenCalled()
  })

  it('successfully refreshes when expired with refreshToken present', async () => {
    const oldUser = createMockUser({ name: 'Old User' })
    const session = createMockSession({
      expiresAt: Math.floor(Date.now() / 1000) - 60,
      refreshToken: 'old-refresh-token',
      user: oldUser,
    })
    mockGetSession.mockResolvedValue(session)

    const newUser = createMockUser({ name: 'Refreshed User' })
    mockRefreshToken.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
      subject: 'test-user-123',
    })
    mockFetchUserProfile.mockResolvedValue(newUser)

    const result = await getAuthUser()

    expect(result).toEqual(newUser)
    expect(mockRefreshToken).toHaveBeenCalledWith('old-refresh-token')
    expect(mockFetchUserProfile).toHaveBeenCalledWith(
      'new-access-token',
      'test-user-123',
    )
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: newUser,
        version: session.version + 1,
      }),
    )
  })

  it('calls clearSession and returns null when refreshToken rejects', async () => {
    const session = createMockSession({
      expiresAt: Math.floor(Date.now() / 1000) - 60,
      refreshToken: 'bad-refresh-token',
    })
    mockGetSession.mockResolvedValue(session)
    mockRefreshToken.mockRejectedValue(new Error('token revoked'))

    const result = await getAuthUser()

    expect(result).toBeNull()
    expect(mockClearSession).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

describe('requireAuth', () => {
  it('returns user when authenticated', async () => {
    const session = createMockSession()
    mockGetSession.mockResolvedValue(session)

    const result = await requireAuth()

    expect(result).toEqual(session.user)
  })

  it('throws redirect to /auth/login when getAuthUser returns null', async () => {
    mockGetSession.mockResolvedValue(null)

    try {
      await requireAuth()
      expect.fail('should have thrown')
    } catch (err: unknown) {
      // TanStack redirect wraps options in an { options } envelope
      const error = err as {
        options: { to: string; search?: Record<string, string> }
      }
      expect(error.options.to).toBe('/auth/login')
    }
  })

  it('includes returnTo in redirect params', async () => {
    mockGetSession.mockResolvedValue(null)

    try {
      await requireAuth('/dashboard')
      expect.fail('should have thrown')
    } catch (err: unknown) {
      const error = err as {
        options: { to: string; search?: Record<string, string> }
      }
      expect(error.options.to).toBe('/auth/login')
      expect(error.options.search).toEqual({ returnTo: '/dashboard' })
    }
  })
})

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------

describe('requireAdmin', () => {
  it('returns user when session has admin role', async () => {
    const adminUser = createMockUser({ roles: ['user', 'admin'] })
    const session = createMockSession({ user: adminUser })
    mockGetSession.mockResolvedValue(session)

    const result = await requireAdmin()

    expect(result).toEqual(adminUser)
  })

  it('throws 403 when no session exists', async () => {
    mockGetSession.mockResolvedValue(null)

    try {
      await requireAdmin()
      expect.fail('should have thrown')
    } catch (err: unknown) {
      const error = err as Error & { status: number }
      expect(error.message).toBe('Authentication required')
      expect(error.status).toBe(403)
    }
  })

  it('throws 403 when user lacks admin role', async () => {
    const regularUser = createMockUser({ roles: ['user'] })
    const session = createMockSession({ user: regularUser })
    mockGetSession.mockResolvedValue(session)

    try {
      await requireAdmin()
      expect.fail('should have thrown')
    } catch (err: unknown) {
      const error = err as Error & { status: number }
      expect(error.message).toBe('Forbidden: admin role required')
      expect(error.status).toBe(403)
    }
  })
})
