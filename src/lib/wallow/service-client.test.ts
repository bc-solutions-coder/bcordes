import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const mockDiscovery = vi.fn()
const mockClientCredentialsGrant = vi.fn()

vi.mock('openid-client', () => ({
  discovery: mockDiscovery,
  clientCredentialsGrant: mockClientCredentialsGrant,
  allowInsecureRequests: Symbol('allowInsecureRequests'),
}))

vi.mock('@tanstack/react-start/server', () => ({
  setResponseStatus: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_CONFIG = { issuer: 'https://auth.example.com' }

function stubEnvVars() {
  vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
  vi.stubEnv('OIDC_SERVICE_CLIENT_ID', 'test-client-id')
  vi.stubEnv('OIDC_SERVICE_CLIENT_SECRET', 'test-secret')
  vi.stubEnv('WALLOW_API_URL', 'https://api.example.com')
  vi.stubEnv('NODE_ENV', 'test')
}

function tokenResponse(accessToken: string, expiresIn = 3600) {
  return { access_token: accessToken, expires_in: expiresIn }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Dynamically import the module to get a fresh singleton each test. */
async function loadModule() {
  const mod = await import('./service-client')
  return mod.serviceClient
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('service-client', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
    stubEnvVars()

    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    mockDiscovery.mockResolvedValue(FAKE_CONFIG)
    mockClientCredentialsGrant.mockResolvedValue(tokenResponse('tok-initial'))
  })

  describe('getServiceToken (via serviceClient.get)', () => {
    it('fetches token on first call', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/test')

      expect(mockDiscovery).toHaveBeenCalledOnce()
      expect(mockClientCredentialsGrant).toHaveBeenCalledOnce()
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
        'Bearer tok-initial',
      )
    })

    it('reuses cached token when not expired', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/first')
      await client.get('/second')

      expect(mockClientCredentialsGrant).toHaveBeenCalledOnce()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('fetches fresh token when cached token is expired', async () => {
      // First grant returns a token that expires immediately (negative TTL)
      mockClientCredentialsGrant
        .mockResolvedValueOnce(tokenResponse('tok-expired', -60))
        .mockResolvedValueOnce(tokenResponse('tok-fresh'))

      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/first')
      await client.get('/second')

      expect(mockClientCredentialsGrant).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
        'Bearer tok-fresh',
      )
    })
  })

  describe('401 retry', () => {
    it('clears token cache, fetches fresh token, retries on 401', async () => {
      mockClientCredentialsGrant
        .mockResolvedValueOnce(tokenResponse('tok-stale'))
        .mockResolvedValueOnce(tokenResponse('tok-refreshed'))

      fetchMock
        .mockResolvedValueOnce(jsonResponse({ title: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/protected')

      // Two grant calls: initial + refresh after 401
      expect(mockClientCredentialsGrant).toHaveBeenCalledTimes(2)
      // Two fetch calls: first 401, second 200
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
        'Bearer tok-refreshed',
      )
    })
  })

  describe('429 retry', () => {
    it('waits and retries on 429', async () => {
      mockClientCredentialsGrant.mockResolvedValue(tokenResponse('tok-ok'))

      fetchMock
        .mockResolvedValueOnce(
          new Response(null, {
            status: 429,
            headers: { 'Retry-After': '0' },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/rate-limited')

      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('missing OIDC_ISSUER', () => {
    it('throws when OIDC_ISSUER is not set', async () => {
      vi.stubEnv('OIDC_ISSUER', '')

      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await expect(client.get('/test')).rejects.toThrow(
        'OIDC_ISSUER environment variable is not set',
      )
    })
  })

  describe('concurrent inflight refresh', () => {
    it('only calls clientCredentialsGrant once for concurrent requests', async () => {
      let resolveGrant!: (value: ReturnType<typeof tokenResponse>) => void
      mockClientCredentialsGrant.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGrant = resolve
          }),
      )

      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()

      // Fire two concurrent requests — both will wait on the same inflight grant
      const p1 = client.get('/a')
      const p2 = client.get('/b')

      // Allow a microtask tick so both requests enter getServiceToken
      await new Promise((r) => setTimeout(r, 0))

      // Only one grant call should have been made
      expect(mockClientCredentialsGrant).toHaveBeenCalledOnce()

      // Resolve the grant
      resolveGrant(tokenResponse('tok-shared'))

      await Promise.all([p1, p2])

      // Still only one grant call
      expect(mockClientCredentialsGrant).toHaveBeenCalledOnce()
      // Both fetches used the same token
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
        'Bearer tok-shared',
      )
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
        'Bearer tok-shared',
      )
    })
  })
})
