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

// ---------------------------------------------------------------------------
// Valkey mock
// ---------------------------------------------------------------------------

const mockRedisGet = vi.fn()
const mockRedisSet = vi.fn()
const mockRedisDel = vi.fn()

const mockRedisClient = {
  get: mockRedisGet,
  set: mockRedisSet,
  del: mockRedisDel,
}

vi.mock('@/lib/valkey', () => ({
  getValkey: vi.fn(() => mockRedisClient),
  keys: {
    session: (id: string) => 'bcordes:session:' + id,
    sessionLock: (id: string) => 'bcordes:lock:session:' + id,
  },
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
// Tests — setSession (Valkey-backed)
// ---------------------------------------------------------------------------

describe('setSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls seal with session ID and secret', async () => {
    const data = makeSessionData({ sessionId: 'seal-test-id' })
    mockSeal.mockResolvedValue('sealed-value')
    mockRedisSet.mockResolvedValue('OK')

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
    mockRedisSet.mockResolvedValue('OK')

    await setSession(data)

    expect(mockSetCookie).toHaveBeenCalledWith(
      '__session',
      'sealed-value',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('calls redis set with session key, JSON data, EX, and 86400', async () => {
    const data = makeSessionData({ sessionId: 'valkey-set-id' })
    mockSeal.mockResolvedValue('sealed-value')
    mockRedisSet.mockResolvedValue('OK')

    await setSession(data)

    expect(mockRedisSet).toHaveBeenCalledWith(
      'bcordes:session:valkey-set-id',
      JSON.stringify(data),
      'EX',
      86400,
    )
  })

  it('sets secure: false when NODE_ENV is not production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const data = makeSessionData()
    mockSeal.mockResolvedValue('sealed-value')
    mockRedisSet.mockResolvedValue('OK')

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
    mockRedisSet.mockResolvedValue('OK')

    await setSession(data)

    expect(mockSetCookie).toHaveBeenCalledWith(
      '__session',
      'sealed-value',
      expect.objectContaining({ secure: true }),
    )

    vi.stubEnv('NODE_ENV', 'test')
  })
})

// ---------------------------------------------------------------------------
// Tests — getSession (Valkey-backed)
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

  it('calls redis get with session key and parses JSON result', async () => {
    const data = makeSessionData({ sessionId: 'valkey-get-id' })
    mockGetCookie.mockReturnValue('sealed-cookie-value')
    mockUnseal.mockResolvedValue('valkey-get-id')
    mockRedisGet.mockResolvedValue(JSON.stringify(data))

    const result = await getSession()

    expect(mockRedisGet).toHaveBeenCalledWith('bcordes:session:valkey-get-id')
    expect(result).toEqual(data)
  })

  it('returns null when redis get returns null (cache miss)', async () => {
    mockGetCookie.mockReturnValue('sealed-cookie-value')
    mockUnseal.mockResolvedValue('non-existent-session-id')
    mockRedisGet.mockResolvedValue(null)

    const result = await getSession()

    expect(mockRedisGet).toHaveBeenCalledWith(
      'bcordes:session:non-existent-session-id',
    )
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tests — sealSessionCookie (Valkey-backed)
// ---------------------------------------------------------------------------

describe('sealSessionCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a cookie header string containing __session=', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    mockRedisSet.mockResolvedValue('OK')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('__session=sealed-cookie')
  })

  it('includes HttpOnly in the cookie header', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    mockRedisSet.mockResolvedValue('OK')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('HttpOnly')
  })

  it('includes Path=/ in the cookie header', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    mockRedisSet.mockResolvedValue('OK')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('Path=/')
  })

  it('includes SameSite=Lax in the cookie header', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    mockRedisSet.mockResolvedValue('OK')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('SameSite=Lax')
  })

  it('includes Max-Age=86400 in the cookie header', async () => {
    mockSeal.mockResolvedValue('sealed-cookie')
    mockRedisSet.mockResolvedValue('OK')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('Max-Age=86400')
  })

  it('includes Secure when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    mockSeal.mockResolvedValue('sealed-cookie')
    mockRedisSet.mockResolvedValue('OK')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    expect(cookie).toContain('Secure')

    vi.stubEnv('NODE_ENV', 'test')
  })

  it('omits Secure when NODE_ENV is not production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    mockSeal.mockResolvedValue('sealed-cookie')
    mockRedisSet.mockResolvedValue('OK')
    const data = makeSessionData()

    const cookie = await sealSessionCookie(data)

    // Split by '; ' and check no part equals 'Secure'
    const parts = cookie.split('; ')
    expect(parts).not.toContain('Secure')
  })

  it('stores session data in Valkey via redis set', async () => {
    const data = makeSessionData({ sessionId: 'seal-cookie-store-id' })
    mockSeal.mockResolvedValue('sealed-for-store')
    mockRedisSet.mockResolvedValue('OK')

    await sealSessionCookie(data)

    expect(mockRedisSet).toHaveBeenCalledWith(
      'bcordes:session:seal-cookie-store-id',
      JSON.stringify(data),
      'EX',
      86400,
    )
  })
})

// ---------------------------------------------------------------------------
// Tests — clearSession (Valkey-backed)
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

  it('calls redis del with session key when cookie exists', async () => {
    mockGetCookie.mockReturnValue('sealed-clear-test')
    mockUnseal.mockResolvedValue('clear-test-id')
    mockRedisDel.mockResolvedValue(1)

    clearSession()

    // Wait for the async unseal to complete
    await vi.waitFor(() => {
      expect(mockRedisDel).toHaveBeenCalledWith('bcordes:session:clear-test-id')
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
// Tests — withRefreshLock (Valkey-backed distributed lock)
// ---------------------------------------------------------------------------

describe('withRefreshLock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes the callback and returns its resolved value', async () => {
    mockRedisSet.mockResolvedValue('OK')
    mockRedisDel.mockResolvedValue(1)

    const result = await withRefreshLock('session-1', () =>
      Promise.resolve('token-abc'),
    )
    expect(result).toBe('token-abc')
  })

  it('acquires a distributed lock with NX and EX on first invocation', async () => {
    mockRedisSet.mockResolvedValue('OK')
    mockRedisDel.mockResolvedValue(1)

    await withRefreshLock('session-lock-1', () => Promise.resolve('done'))

    expect(mockRedisSet).toHaveBeenCalledWith(
      'bcordes:lock:session:session-lock-1',
      '1',
      'EX',
      10,
      'NX',
    )
  })

  it('does not invoke the callback when lock is already held (NX returns null)', async () => {
    // First call acquires the lock
    mockRedisSet.mockResolvedValueOnce('OK')
    mockRedisDel.mockResolvedValue(1)

    const callbackA = vi.fn(() => Promise.resolve('first'))
    const callbackB = vi.fn(() => Promise.resolve('second'))

    await withRefreshLock('session-lock-2', callbackA)

    // Second call fails to acquire lock (NX returns null)
    mockRedisSet.mockResolvedValueOnce(null)

    // The second call should not invoke its callback
    await withRefreshLock('session-lock-2', callbackB)

    expect(callbackA).toHaveBeenCalledTimes(1)
    expect(callbackB).not.toHaveBeenCalled()
  })

  it('runs independently for different sessionIds', async () => {
    mockRedisSet.mockResolvedValue('OK')
    mockRedisDel.mockResolvedValue(1)

    const callbackA = vi.fn(() => Promise.resolve('result-a'))
    const callbackB = vi.fn(() => Promise.resolve('result-b'))

    const rA = await withRefreshLock('session-a', callbackA)
    const rB = await withRefreshLock('session-b', callbackB)

    expect(callbackA).toHaveBeenCalledTimes(1)
    expect(callbackB).toHaveBeenCalledTimes(1)
    expect(rA).toBe('result-a')
    expect(rB).toBe('result-b')
  })

  it('releases the lock after callback resolves', async () => {
    mockRedisSet.mockResolvedValue('OK')
    mockRedisDel.mockResolvedValue(1)

    await withRefreshLock('session-release', () => Promise.resolve('done'))

    expect(mockRedisDel).toHaveBeenCalledWith(
      'bcordes:lock:session:session-release',
    )
  })

  it('propagates rejection and still releases the lock', async () => {
    mockRedisSet.mockResolvedValue('OK')
    mockRedisDel.mockResolvedValue(1)

    const error = new Error('refresh failed')

    await expect(
      withRefreshLock('session-err', () => Promise.reject(error)),
    ).rejects.toThrow('refresh failed')

    expect(mockRedisDel).toHaveBeenCalledWith(
      'bcordes:lock:session:session-err',
    )
  })
})
