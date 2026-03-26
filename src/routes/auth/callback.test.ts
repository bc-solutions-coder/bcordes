import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import type { TokenResult } from '@/lib/auth/oidc'
import type { User } from '@/lib/auth/types'
import { exchangeCode, fetchUserProfile } from '@/lib/auth/oidc'
import { sealSessionCookie } from '@/lib/auth/session'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/oidc', () => ({
  exchangeCode: vi.fn(),
  fetchUserProfile: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  sealSessionCookie: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
}))

// Import the route module — createFileRoute is mocked so it returns the config object
const routeModule = await import('./callback')
const handler = (
  routeModule.Route as unknown as {
    server: {
      handlers: { GET: (ctx: { request: Request }) => Promise<Response> }
    }
  }
).server.handlers.GET

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:3000'

function buildUrl(params: Record<string, string> = {}): string {
  const url = new URL('/auth/callback', BASE_URL)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ')
}

function makeRequest(
  params: Record<string, string> = {},
  cookies: Record<string, string> = {},
): Request {
  return new Request(buildUrl(params), {
    headers: { cookie: buildCookieHeader(cookies) },
  })
}

const fakeTokens: TokenResult = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  idToken: 'id-789',
  expiresIn: 3600,
  subject: 'user-sub',
}

const fakeUser: User = {
  id: 'user-sub',
  name: 'Test User',
  email: 'test@example.com',
  roles: ['user'],
  permissions: [],
  tenantId: 'tenant-1',
  tenantName: 'Test Tenant',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /auth/login?error=missing_params when code is missing', async () => {
    const req = makeRequest(
      { state: 'abc' },
      { __oauth_state: 'abc', __oauth_code_verifier: 'verifier' },
    )
    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/auth/login?error=missing_params')
  })

  it('redirects to /auth/login?error=missing_params when state is missing', async () => {
    const req = makeRequest(
      { code: 'the-code' },
      { __oauth_state: 'abc', __oauth_code_verifier: 'verifier' },
    )
    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/auth/login?error=missing_params')
  })

  it('redirects to /auth/login?error=missing_params when cookies are absent', async () => {
    const req = makeRequest({ code: 'the-code', state: 'abc' })
    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/auth/login?error=missing_params')
  })

  it('redirects to ?error=state_mismatch when state does not match', async () => {
    const req = makeRequest(
      { code: 'the-code', state: 'query-state' },
      { __oauth_state: 'cookie-state', __oauth_code_verifier: 'verifier' },
    )
    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/auth/login?error=state_mismatch')
  })

  it('sets session cookie and redirects to / on successful exchange', async () => {
    vi.mocked(exchangeCode).mockResolvedValue(fakeTokens)
    vi.mocked(fetchUserProfile).mockResolvedValue(fakeUser)
    vi.mocked(sealSessionCookie).mockResolvedValue(
      '__session=sealed-value; HttpOnly; Path=/',
    )

    const state = 'matching-state'
    const req = makeRequest(
      { code: 'auth-code', state },
      { __oauth_state: state, __oauth_code_verifier: 'verifier' },
    )

    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
    expect(exchangeCode).toHaveBeenCalledWith(
      'auth-code',
      'verifier',
      expect.stringContaining('/auth/callback'),
      state,
    )
    expect(fetchUserProfile).toHaveBeenCalledWith('access-123', 'user-sub')

    const setCookies = res.headers.getSetCookie()
    expect(setCookies.some((c: string) => c.includes('__session'))).toBe(true)
    // Temp cookies should be cleared
    expect(setCookies.some((c: string) => c.includes('__oauth_state=;'))).toBe(
      true,
    )
    expect(
      setCookies.some((c: string) => c.includes('__oauth_code_verifier=;')),
    ).toBe(true)
  })

  it('uses same-origin returnTo cookie as redirect destination', async () => {
    vi.mocked(exchangeCode).mockResolvedValue(fakeTokens)
    vi.mocked(fetchUserProfile).mockResolvedValue(fakeUser)
    vi.mocked(sealSessionCookie).mockResolvedValue(
      '__session=sealed; HttpOnly; Path=/',
    )

    const state = 'some-state'
    const req = makeRequest(
      { code: 'auth-code', state },
      {
        __oauth_state: state,
        __oauth_code_verifier: 'verifier',
        __oauth_return_to: '/dashboard/settings',
      },
    )

    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/dashboard/settings')
  })

  it('ignores cross-origin returnTo and redirects to / (open redirect protection)', async () => {
    vi.mocked(exchangeCode).mockResolvedValue(fakeTokens)
    vi.mocked(fetchUserProfile).mockResolvedValue(fakeUser)
    vi.mocked(sealSessionCookie).mockResolvedValue(
      '__session=sealed; HttpOnly; Path=/',
    )

    const state = 'some-state'
    const req = makeRequest(
      { code: 'auth-code', state },
      {
        __oauth_state: state,
        __oauth_code_verifier: 'verifier',
        __oauth_return_to: 'https://evil.com/steal',
      },
    )

    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })

  it('redirects to ?error=auth_failed when exchangeCode throws', async () => {
    vi.mocked(exchangeCode).mockRejectedValue(new Error('token exchange boom'))

    const state = 'ok-state'
    const req = makeRequest(
      { code: 'auth-code', state },
      { __oauth_state: state, __oauth_code_verifier: 'verifier' },
    )

    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/auth/login?error=auth_failed')
  })

  it('falls back to 3600 when tokens.expiresIn is 0', async () => {
    const tokensNoExpiry: TokenResult = { ...fakeTokens, expiresIn: 0 }
    vi.mocked(exchangeCode).mockResolvedValue(tokensNoExpiry)
    vi.mocked(fetchUserProfile).mockResolvedValue(fakeUser)
    vi.mocked(sealSessionCookie).mockResolvedValue(
      '__session=sealed; HttpOnly; Path=/',
    )

    const state = 'ok-state'
    const req = makeRequest(
      { code: 'auth-code', state },
      { __oauth_state: state, __oauth_code_verifier: 'verifier' },
    )

    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    // Verify sealSessionCookie was called with an expiresAt ~3600s from now
    const sessionArg = vi.mocked(sealSessionCookie).mock.calls[0][0]
    const nowSec = Math.floor(Date.now() / 1000)
    expect(sessionArg.expiresAt).toBeGreaterThanOrEqual(nowSec + 3599)
    expect(sessionArg.expiresAt).toBeLessThanOrEqual(nowSec + 3601)
  })

  it('falls back to 3600 when tokens.expiresIn is undefined', async () => {
    const tokensUndefinedExpiry: TokenResult = {
      ...fakeTokens,
      expiresIn: undefined as unknown as number,
    }
    vi.mocked(exchangeCode).mockResolvedValue(tokensUndefinedExpiry)
    vi.mocked(fetchUserProfile).mockResolvedValue(fakeUser)
    vi.mocked(sealSessionCookie).mockResolvedValue(
      '__session=sealed; HttpOnly; Path=/',
    )

    const state = 'ok-state'
    const req = makeRequest(
      { code: 'auth-code', state },
      { __oauth_state: state, __oauth_code_verifier: 'verifier' },
    )

    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    const sessionArg = vi.mocked(sealSessionCookie).mock.calls[0][0]
    const nowSec = Math.floor(Date.now() / 1000)
    expect(sessionArg.expiresAt).toBeGreaterThanOrEqual(nowSec + 3599)
    expect(sessionArg.expiresAt).toBeLessThanOrEqual(nowSec + 3601)
  })

  it('falls back to / when returnTo is an unparseable URL (isSameOrigin catch branch)', async () => {
    vi.mocked(exchangeCode).mockResolvedValue(fakeTokens)
    vi.mocked(fetchUserProfile).mockResolvedValue(fakeUser)
    vi.mocked(sealSessionCookie).mockResolvedValue(
      '__session=sealed; HttpOnly; Path=/',
    )

    const state = 'ok-state'
    const req = makeRequest(
      { code: 'auth-code', state },
      {
        __oauth_state: state,
        __oauth_code_verifier: 'verifier',
        __oauth_return_to: 'http://[invalid',
      },
    )

    const res = await handler({ request: req })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })

  it('clears temp cookies on every response (error path)', async () => {
    const req = makeRequest() // missing everything
    const res = await handler({ request: req })
    const setCookies = res.headers.getSetCookie()

    expect(setCookies.some((c: string) => c.includes('__oauth_state=;'))).toBe(
      true,
    )
    expect(
      setCookies.some((c: string) => c.includes('__oauth_code_verifier=;')),
    ).toBe(true)
    expect(
      setCookies.some((c: string) => c.includes('__oauth_return_to=;')),
    ).toBe(true)
  })
})
