import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setResponseStatus } from '@tanstack/react-start/server'
import { WallowError } from './errors'
import { createWallowClient } from './client'
import { createMockSession } from '@/test/mocks/auth'

// ---------------------------------------------------------------------------
// Imports of mocked modules (typed via vi.mocked)
// ---------------------------------------------------------------------------

import { getSession, setSession, withRefreshLock } from '@/lib/auth/session'
import { parseUserFromToken, refreshToken } from '@/lib/auth/oidc'

// ---------------------------------------------------------------------------
// vi.mock() — hoisted
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  withRefreshLock: vi.fn(),
}))

vi.mock('@/lib/auth/oidc', () => ({
  refreshToken: vi.fn(),
  parseUserFromToken: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  setResponseStatus: vi.fn(),
}))

vi.mock('./config', () => ({
  WALLOW_BASE_URL: 'https://api.test',
}))

const mockGetSession = vi.mocked(getSession)
const mockSetSession = vi.mocked(setSession)
const mockWithRefreshLock = vi.mocked(withRefreshLock)
const mockRefreshToken = vi.mocked(refreshToken)
const mockParseUserFromToken = vi.mocked(parseUserFromToken)
const mockSetResponseStatus = vi.mocked(setResponseStatus)

// ---------------------------------------------------------------------------
// Stub global fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn<typeof globalThis.fetch>()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  })
}

function problemResponse(status: number, code: string): Response {
  return new Response(
    JSON.stringify({
      type: `https://httpstatuses.com/${status}`,
      title: 'Error',
      status,
      detail: `Test error ${status}`,
      traceId: 'trace-123',
      code,
    }),
    {
      status,
      statusText: 'Error',
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createWallowClient', () => {
  const session = createMockSession()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets 401 response status when getSession returns null', async () => {
    mockGetSession.mockResolvedValue(null)

    await expect(createWallowClient()).rejects.toThrow('No active session')
    expect(mockSetResponseStatus).toHaveBeenCalledWith(401)
  })

  it('returns successful 200 response with correct auth header', async () => {
    mockGetSession.mockResolvedValue(session)
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }))

    const client = await createWallowClient()
    const response = await client.get('/test')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })

    // Verify auth header
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.test/test')
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${session.accessToken}`,
    )
  })

  it('retries with refreshed token on 401', async () => {
    const refreshedSession = createMockSession({
      accessToken: 'refreshed-access-token',
      refreshToken: 'refreshed-refresh-token',
      version: 2,
    })

    // First getSession call (createWallowClient) returns session
    // Second getSession call (inside request()) returns session
    mockGetSession.mockResolvedValue(session)

    // First fetch returns 401, second returns 200
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ retried: true }))

    // withRefreshLock executes the callback and returns refreshed session
    mockWithRefreshLock.mockImplementation(async (_id, fn) => {
      mockRefreshToken.mockResolvedValue({
        accessToken: 'refreshed-access-token',
        refreshToken: 'refreshed-refresh-token',
        idToken: 'refreshed-id-token',
        expiresIn: 3600,
      })
      mockParseUserFromToken.mockReturnValue(session.user)
      mockSetSession.mockResolvedValue(undefined)
      return (fn as () => Promise<typeof refreshedSession>)()
    })

    const client = await createWallowClient()
    const response = await client.get('/protected')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ retried: true })

    // Should have called fetch twice
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Second fetch should use refreshed token
    const [, secondInit] = mockFetch.mock.calls[1]
    expect((secondInit?.headers as Record<string, string>).Authorization).toBe(
      'Bearer refreshed-access-token',
    )
  })

  it('retries after 429 with Retry-After header', async () => {
    mockGetSession.mockResolvedValue(session)

    const rateLimitResponse = new Response(null, {
      status: 429,
      headers: { 'Retry-After': '1' },
    })

    mockFetch
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(jsonResponse({ retried: true }))

    const client = await createWallowClient()
    const responsePromise = client.get('/rate-limited')

    // Advance past the Retry-After delay (1s = 1000ms)
    await vi.advanceTimersByTimeAsync(1000)

    const response = await responsePromise

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ retried: true })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws WallowError with correct status on non-ok response (422)', async () => {
    mockGetSession.mockResolvedValue(session)

    mockFetch.mockResolvedValue(problemResponse(422, 'VALIDATION_ERROR'))

    const client = await createWallowClient()

    try {
      await client.post('/submit', { data: 'bad' })
      expect.fail('Expected WallowError to be thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(WallowError)
      const wallowErr = err as WallowError
      expect(wallowErr.status).toBe(422)
      expect(wallowErr.code).toBe('VALIDATION_ERROR')
      expect(mockSetResponseStatus).toHaveBeenCalledWith(422)
    }
  })

  it('throws WallowError with NETWORK_ERROR code when fetch rejects', async () => {
    mockGetSession.mockResolvedValue(session)

    mockFetch.mockRejectedValue(new TypeError('fetch failed'))

    const client = await createWallowClient()

    try {
      await client.get('/unreachable')
      expect.fail('Expected WallowError to be thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(WallowError)
      const wallowErr = err as WallowError
      expect(wallowErr.code).toBe('NETWORK_ERROR')
      expect(wallowErr.status).toBe(503)
    }
  })

  it('throws network error when retry fetch after 401 refresh throws', async () => {
    const refreshedSession = createMockSession({
      accessToken: 'refreshed-access-token',
      refreshToken: 'refreshed-refresh-token',
      version: 2,
    })

    mockGetSession.mockResolvedValue(session)

    // First fetch returns 401, retry fetch throws network error
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockRejectedValueOnce(new TypeError('fetch failed on retry'))

    mockWithRefreshLock.mockImplementation(async (_id, fn) => {
      mockRefreshToken.mockResolvedValue({
        accessToken: 'refreshed-access-token',
        refreshToken: 'refreshed-refresh-token',
        idToken: 'refreshed-id-token',
        expiresIn: 3600,
      })
      mockParseUserFromToken.mockReturnValue(session.user)
      mockSetSession.mockResolvedValue(undefined)
      return (fn as () => Promise<typeof refreshedSession>)()
    })

    const client = await createWallowClient()

    try {
      await client.get('/protected')
      expect.fail('Expected WallowError to be thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(WallowError)
      const wallowErr = err as WallowError
      expect(wallowErr.code).toBe('NETWORK_ERROR')
      expect(wallowErr.status).toBe(503)
    }

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws network error when retry fetch after 429 delay throws', async () => {
    mockGetSession.mockResolvedValue(session)

    const rateLimitResponse = new Response(null, {
      status: 429,
      headers: { 'Retry-After': '1' },
    })

    // First fetch returns 429, retry fetch throws network error
    mockFetch
      .mockResolvedValueOnce(rateLimitResponse)
      .mockRejectedValueOnce(new TypeError('fetch failed on retry'))

    const client = await createWallowClient()
    const responsePromise = client.get('/rate-limited').catch((err) => {
      expect(err).toBeInstanceOf(WallowError)
      const wallowErr = err as WallowError
      expect(wallowErr.code).toBe('NETWORK_ERROR')
      expect(wallowErr.status).toBe(503)
      return 'caught'
    })

    // Advance past the Retry-After delay (1s = 1000ms)
    await vi.advanceTimersByTimeAsync(1000)

    const result = await responsePromise
    expect(result).toBe('caught')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
