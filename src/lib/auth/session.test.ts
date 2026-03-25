// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionData } from './types'

// ---------------------------------------------------------------------------
// Environment & Mocks (hoisted)
// ---------------------------------------------------------------------------

vi.stubEnv('SESSION_SECRET', 'a]3kf9$mLp2xQz!vR7nW^tY0uBc8dEhJ')

const mockSeal = vi.fn()
const mockUnseal = vi.fn()

vi.mock('iron-webcrypto', () => ({
  defaults: {},
  seal: (...args: Array<unknown>) => mockSeal(...args),
  unseal: (...args: Array<unknown>) => mockUnseal(...args),
}))

const mockGetCookie = vi.fn()
const mockSetCookie = vi.fn()
const mockDeleteCookie = vi.fn()

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: (...args: Array<unknown>) => mockGetCookie(...args),
  setCookie: (...args: Array<unknown>) => mockSetCookie(...args),
  deleteCookie: (...args: Array<unknown>) => mockDeleteCookie(...args),
}))

const {
  getSession,
  setSession,
  sealSessionCookie,
  clearSession,
  withRefreshLock,
} = await import('./session')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSessionData(overrides: Partial<SessionData> = {}): SessionData {
  return {
    sessionId: 'test-session-id',
    accessToken: 'access-123',
    refreshToken: 'refresh-456',
    idToken: 'id-789',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['user'],
      permissions: [],
      tenantId: 'tenant-1',
      tenantName: 'Test Tenant',
    },
    version: 1,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests — Module import guard
// ---------------------------------------------------------------------------

describe('SESSION_SECRET validation', () => {
  it('throws when SESSION_SECRET is shorter than 32 characters', async () => {
    vi.resetModules()
    vi.stubEnv('SESSION_SECRET', 'too-short')

    await expect(() => import('./session')).rejects.toThrow(
      'SESSION_SECRET must be set and at least 32 characters',
    )

    // Restore for subsequent tests
    vi.stubEnv('SESSION_SECRET', 'a]3kf9$mLp2xQz!vR7nW^tY0uBc8dEhJ')
  })

  it('throws when SESSION_SECRET is empty', async () => {
    vi.resetModules()
    vi.stubEnv('SESSION_SECRET', '')

    await expect(() => import('./session')).rejects.toThrow(
      'SESSION_SECRET must be set and at least 32 characters',
    )

    vi.stubEnv('SESSION_SECRET', 'a]3kf9$mLp2xQz!vR7nW^tY0uBc8dEhJ')
  })
})

// ---------------------------------------------------------------------------
// Tests — getSession
// ---------------------------------------------------------------------------

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when getCookie returns undefined', async () => {
    mockGetCookie.mockReturnValue(undefined)

    const result = await getSession()

    expect(result).toBeNull()
    expect(mockUnseal).not.toHaveBeenCalled()
  })

  it('returns null when unseal throws', async () => {
    mockGetCookie.mockReturnValue('sealed-cookie-value')
    mockUnseal.mockRejectedValue(new Error('bad seal'))

    const result = await getSession()

    expect(result).toBeNull()
  })

  it('returns null when unsealed session ID is not in the store', async () => {
    mockGetCookie.mockReturnValue('sealed-cookie-value')
    mockUnseal.mockResolvedValue('non-existent-session-id')

    const result = await getSession()

    expect(result).toBeNull()
  })

  it('returns stored SessionData on valid seal/store hit', async () => {
    const data = makeSessionData({ sessionId: 'stored-id' })

    // First store it via setSession
    mockSeal.mockResolvedValue('sealed-stored-id')
    await setSession(data)

    // Now retrieve it
    mockGetCookie.mockReturnValue('sealed-stored-id')
    mockUnseal.mockResolvedValue('stored-id')

    const result = await getSession()

    expect(result).toEqual(data)
  })
})

// ---------------------------------------------------------------------------
// Tests — setSession
// ---------------------------------------------------------------------------

describe('setSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls seal with session ID and secret', async () => {
    const data = makeSessionData({ sessionId: 'seal-test-id' })
    mockSeal.mockResolvedValue('sealed-value')

    await setSession(data)

    expect(mockSeal).toHaveBeenCalledWith(
      'seal-test-id',
      expect.any(String),
      {},
    )
  })

  it('calls setCookie with httpOnly: true', async () => {
    const data = makeSessionData()
    mockSeal.mockResolvedValue('sealed-value')

    await setSession(data)

    expect(mockSetCookie).toHaveBeenCalledWith(
      '__session',
      'sealed-value',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('sets secure: false when NODE_ENV is not production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const data = makeSessionData()
    mockSeal.mockResolvedValue('sealed-value')

    await setSession(data)

    expect(mockSetCookie).toHaveBeenCalledWith(
      '__session',
      'sealed-value',
      expect.objectContaining({ secure: false }),
    )
  })

  it('sets secure: true when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const data = makeSessionData()
    mockSeal.mockResolvedValue('sealed-value')

    await setSession(data)

    expect(mockSetCookie).toHaveBeenCalledWith(
      '__session',
      'sealed-value',
      expect.objectContaining({ secure: true }),
    )

    vi.stubEnv('NODE_ENV', 'test')
  })

  it('stores data in module-level Map (retrievable via getSession)', async () => {
    const data = makeSessionData({ sessionId: 'map-test-id' })
    mockSeal.mockResolvedValue('sealed-map-test')

    await setSession(data)

    // Verify by retrieving
    mockGetCookie.mockReturnValue('sealed-map-test')
    mockUnseal.mockResolvedValue('map-test-id')

    const result = await getSession()
    expect(result).toEqual(data)
  })
})

// ---------------------------------------------------------------------------
// Tests — sealSessionCookie
// ---------------------------------------------------------------------------

describe('sealSessionCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a cookie header string containing __session=', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('__session=sealed-cookie')
  })

  it('includes HttpOnly in the cookie header', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('HttpOnly')
  })

  it('includes Path=/ in the cookie header', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('Path=/')
  })

  it('includes SameSite=Lax in the cookie header', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('SameSite=Lax')
  })

  it('includes Max-Age=86400 in the cookie header', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('Max-Age=86400')
  })

  it('includes Secure when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    mockSeal.mockResolvedValue('sealed-cookie')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('Secure')

    vi.stubEnv('NODE_ENV', 'test')
  })

  it('omits Secure when NODE_ENV is not production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    mockSeal.mockResolvedValue('sealed-cookie')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    // Split by '; ' and check no part equals 'Secure'
    const parts = cookie.split('; ')
    expect(parts).not.toContain('Secure')
  })

  it('stores session data in module-level Map', async () => {
    const data = makeSessionData({ sessionId: 'seal-cookie-store-id' })
    mockSeal.mockResolvedValue('sealed-for-store')

    await sealSessionCookie(data)

    // Verify by retrieving
    mockGetCookie.mockReturnValue('sealed-for-store')
    mockUnseal.mockResolvedValue('seal-cookie-store-id')

    const result = await getSession()
    expect(result).toEqual(data)
  })
})

// ---------------------------------------------------------------------------
// Tests — clearSession
// ---------------------------------------------------------------------------

describe('clearSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls deleteCookie even when getCookie returns undefined', () => {
    mockGetCookie.mockReturnValue(undefined)

    clearSession()

    expect(mockDeleteCookie).toHaveBeenCalledWith('__session', { path: '/' })
  })

  it('calls deleteCookie even when unseal rejects', () => {
    mockGetCookie.mockReturnValue('sealed-value')
    mockUnseal.mockRejectedValue(new Error('bad seal'))

    clearSession()

    expect(mockDeleteCookie).toHaveBeenCalledWith('__session', { path: '/' })
  })

  it('attempts to unseal and remove from store when cookie exists', async () => {
    // First store a session
    const data = makeSessionData({ sessionId: 'clear-test-id' })
    mockSeal.mockResolvedValue('sealed-clear-test')
    await setSession(data)

    // Now clear it
    mockGetCookie.mockReturnValue('sealed-clear-test')
    mockUnseal.mockResolvedValue('clear-test-id')

    clearSession()

    expect(mockDeleteCookie).toHaveBeenCalledWith('__session', { path: '/' })

    // Wait for the async unseal to complete
    await vi.waitFor(async () => {
      mockGetCookie.mockReturnValue('sealed-clear-test')
      mockUnseal.mockResolvedValue('clear-test-id')
      const result = await getSession()
      expect(result).toBeNull()
    })
  })

  it('calls deleteCookie when getCookie throws', () => {
    mockGetCookie.mockImplementation(() => {
      throw new Error('getCookie exploded')
    })

    clearSession()

    expect(mockDeleteCookie).toHaveBeenCalledWith('__session', { path: '/' })
  })
})

// ---------------------------------------------------------------------------
// Tests — withRefreshLock (existing tests)
// ---------------------------------------------------------------------------

describe('withRefreshLock', () => {
  it('executes the callback and returns its resolved value', async () => {
    const result = await withRefreshLock('session-1', () =>
      Promise.resolve('token-abc'),
    )
    expect(result).toBe('token-abc')
  })

  it('shares the same in-flight promise for concurrent calls with the same sessionId', async () => {
    let resolve!: (value: string) => void
    const pending = new Promise<string>((r) => {
      resolve = r
    })
    const callback = vi.fn(() => pending)

    const first = withRefreshLock('session-2', callback)
    const second = withRefreshLock('session-2', callback)

    resolve('shared-result')

    const [r1, r2] = await Promise.all([first, second])
    expect(r1).toBe('shared-result')
    expect(r2).toBe('shared-result')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('runs independently for different sessionIds', async () => {
    let resolveA!: (value: string) => void
    let resolveB!: (value: string) => void
    const pendingA = new Promise<string>((r) => {
      resolveA = r
    })
    const pendingB = new Promise<string>((r) => {
      resolveB = r
    })
    const callbackA = vi.fn(() => pendingA)
    const callbackB = vi.fn(() => pendingB)

    const promiseA = withRefreshLock('session-a', callbackA)
    const promiseB = withRefreshLock('session-b', callbackB)

    expect(callbackA).toHaveBeenCalledTimes(1)
    expect(callbackB).toHaveBeenCalledTimes(1)

    resolveA('result-a')
    resolveB('result-b')

    const [rA, rB] = await Promise.all([promiseA, promiseB])
    expect(rA).toBe('result-a')
    expect(rB).toBe('result-b')
  })

  it('removes the lock entry after callback resolves so next call runs fresh', async () => {
    const callbackFirst = vi.fn(() => Promise.resolve('first'))
    const callbackSecond = vi.fn(() => Promise.resolve('second'))

    const r1 = await withRefreshLock('session-3', callbackFirst)
    expect(r1).toBe('first')
    expect(callbackFirst).toHaveBeenCalledTimes(1)

    const r2 = await withRefreshLock('session-3', callbackSecond)
    expect(r2).toBe('second')
    expect(callbackSecond).toHaveBeenCalledTimes(1)
  })

  it('propagates rejection to all waiters and cleans up the lock entry', async () => {
    let reject!: (error: Error) => void
    const pending = new Promise<string>((_, r) => {
      reject = r
    })
    const callback = vi.fn(() => pending)

    const first = withRefreshLock('session-4', callback)
    const second = withRefreshLock('session-4', callback)

    const error = new Error('refresh failed')
    reject(error)

    await expect(first).rejects.toThrow('refresh failed')
    await expect(second).rejects.toThrow('refresh failed')
    expect(callback).toHaveBeenCalledTimes(1)

    // Lock should be cleaned up — a new call should invoke the callback
    const recovery = vi.fn(() => Promise.resolve('recovered'))
    const r3 = await withRefreshLock('session-4', recovery)
    expect(r3).toBe('recovered')
    expect(recovery).toHaveBeenCalledTimes(1)
  })
})
