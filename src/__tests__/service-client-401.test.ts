import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockClientCredentialsGrant = vi.fn()
const mockDiscovery = vi.fn()

vi.mock('openid-client', () => ({
  allowInsecureRequests: Symbol('allowInsecureRequests'),
  clientCredentialsGrant: (...args: unknown[]) => mockClientCredentialsGrant(...args),
  discovery: (...args: unknown[]) => mockDiscovery(...args),
}))

describe('service client — 401 retry', () => {
  const originalEnv = { ...process.env }
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    process.env.OIDC_ISSUER = 'https://auth.test.local'
    process.env.OIDC_SERVICE_CLIENT_ID = 'svc-client'
    process.env.OIDC_SERVICE_CLIENT_SECRET = 'svc-secret'
    process.env.WALLOW_API_URL = 'https://api.test.local'

    const fakeConfig = { serverMetadata: () => ({ issuer: 'https://auth.test.local' }) }
    mockDiscovery.mockResolvedValue(fakeConfig)

    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should refresh token and retry on 401', async () => {
    // First token
    mockClientCredentialsGrant.mockResolvedValueOnce({
      access_token: 'token-1',
      expires_in: 3600,
    })
    // Refreshed token after 401
    mockClientCredentialsGrant.mockResolvedValueOnce({
      access_token: 'token-2',
      expires_in: 3600,
    })

    // First call returns 401, second succeeds
    fetchSpy
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const { serviceClient } = await import('@/lib/wallow/service-client')
    const response = await serviceClient.get('/api/v1/test')

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    // Second call should use the refreshed token
    const secondCallHeaders = fetchSpy.mock.calls[1][1].headers
    expect(secondCallHeaders.Authorization).toBe('Bearer token-2')
  })

  it('should not retry more than once on repeated 401', async () => {
    mockClientCredentialsGrant.mockResolvedValue({
      access_token: 'token-stale',
      expires_in: 3600,
    })

    fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    const { serviceClient } = await import('@/lib/wallow/service-client')

    await expect(serviceClient.get('/api/v1/test')).rejects.toThrow()
    // Should have tried twice: original + one retry
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
