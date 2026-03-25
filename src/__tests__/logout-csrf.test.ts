import { describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks — session + oidc
// ---------------------------------------------------------------------------

const { mockGetSession, mockClearSession, mockGetLogoutUrl } = vi.hoisted(
  () => ({
    mockGetSession: vi.fn(),
    mockClearSession: vi.fn(),
    mockGetLogoutUrl: vi.fn(),
  }),
)

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
  clearSession: mockClearSession,
}))

vi.mock('@/lib/auth/oidc', () => ({
  getLogoutUrl: mockGetLogoutUrl,
}))

// Must import after mocks are set up
import { Route } from '@/routes/auth/logout'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const handlers = (Route as any).options?.server?.handlers ?? {}

// ---------------------------------------------------------------------------
// 1. GET handler must NOT exist (CSRF protection)
// ---------------------------------------------------------------------------

describe('Logout CSRF — GET handler removed', () => {
  it('should not export a GET handler', () => {
    expect(handlers.GET).toBeUndefined()
  })

  it('Route handlers object should not contain a GET key', () => {
    expect(Object.keys(handlers)).not.toContain('GET')
  })
})

// ---------------------------------------------------------------------------
// 2. POST handler performs logout correctly
// ---------------------------------------------------------------------------

describe('Logout CSRF — POST handler', () => {
  it('should export a POST handler', () => {
    expect(handlers.POST).toBeDefined()
    expect(typeof handlers.POST).toBe('function')
  })

  it('clears session and redirects to logout URL', async () => {
    mockGetSession.mockResolvedValue({ idToken: 'test-id-token' })
    mockGetLogoutUrl.mockResolvedValue(
      'https://auth.example.com/logout?post_logout_redirect_uri=https://app.example.com/',
    )

    const request = new Request('https://app.example.com/auth/logout', {
      method: 'POST',
    })

    const response: Response = await handlers.POST({ request })

    expect(mockClearSession).toHaveBeenCalled()
    expect(mockGetLogoutUrl).toHaveBeenCalledWith(
      'test-id-token',
      'https://app.example.com/',
    )
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      'https://auth.example.com/logout?post_logout_redirect_uri=https://app.example.com/',
    )
  })
})
