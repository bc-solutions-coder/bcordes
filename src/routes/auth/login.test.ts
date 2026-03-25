import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  getAuthorizationUrl,
  randomPKCECodeVerifier,
  randomState,
} from '~/lib/auth/oidc'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

vi.mock('~/lib/auth/oidc', () => ({
  randomState: vi.fn(() => 'mock-state-value'),
  randomPKCECodeVerifier: vi.fn(() => 'mock-code-verifier'),
  getAuthorizationUrl: vi.fn(() =>
    Promise.resolve('https://auth.example.com/authorize?foo=bar'),
  ),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
}))

const routeModule = await import('./login')
const handler = (
  routeModule.Route as unknown as {
    server: {
      handlers: {
        GET: (ctx: { request: Request }) => Promise<Response>
      }
    }
  }
).server.handlers.GET

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates state and code_verifier, then redirects to authorization URL', async () => {
    const req = new Request('http://localhost:3000/auth/login')
    const res = await handler({ request: req })

    expect(randomState).toHaveBeenCalled()
    expect(randomPKCECodeVerifier).toHaveBeenCalled()
    expect(getAuthorizationUrl).toHaveBeenCalledWith(
      'mock-state-value',
      'mock-code-verifier',
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(
      'https://auth.example.com/authorize?foo=bar',
    )
  })

  it('sets __oauth_state and __oauth_code_verifier cookies', async () => {
    const req = new Request('http://localhost:3000/auth/login')
    const res = await handler({ request: req })

    const setCookies = res.headers.getSetCookie()
    expect(
      setCookies.some((c: string) =>
        c.startsWith('__oauth_state=mock-state-value'),
      ),
    ).toBe(true)
    expect(
      setCookies.some((c: string) =>
        c.startsWith('__oauth_code_verifier=mock-code-verifier'),
      ),
    ).toBe(true)

    // All cookies should be HttpOnly
    for (const c of setCookies) {
      expect(c).toContain('HttpOnly')
    }
  })

  it('sets __oauth_return_to cookie when returnTo query param is provided', async () => {
    const req = new Request(
      'http://localhost:3000/auth/login?returnTo=/dashboard',
    )
    const res = await handler({ request: req })

    const setCookies = res.headers.getSetCookie()
    expect(
      setCookies.some((c: string) => c.includes('__oauth_return_to=')),
    ).toBe(true)
    const returnToCookie = setCookies.find((c: string) =>
      c.includes('__oauth_return_to='),
    )
    expect(returnToCookie).toContain(encodeURIComponent('/dashboard'))
  })

  it('does not set __oauth_return_to cookie when returnTo is absent', async () => {
    const req = new Request('http://localhost:3000/auth/login')
    const res = await handler({ request: req })

    const setCookies = res.headers.getSetCookie()
    expect(
      setCookies.some((c: string) => c.includes('__oauth_return_to=')),
    ).toBe(false)
  })

  it('sets Max-Age=600 on oauth cookies', async () => {
    const req = new Request('http://localhost:3000/auth/login')
    const res = await handler({ request: req })

    const setCookies = res.headers.getSetCookie()
    for (const c of setCookies) {
      expect(c).toContain('Max-Age=600')
    }
  })
})
