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

const mockRedisGet = vi.fn()
const mockRedisSet = vi.fn()
const mockRedisDel = vi.fn()

const mockRedis = {
  get: mockRedisGet,
  set: mockRedisSet,
  del: mockRedisDel,
}

vi.mock('~/lib/valkey', () => ({
  getValkey: vi.fn(() => mockRedis),
  keys: {
    serviceToken: () => 'bcordes:service-token',
    serviceTokenLock: () => 'bcordes:lock:service-token',
    oidcConfig: () => 'bcordes:oidc-config',
  },
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

    // Default: Valkey cache is empty
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
    mockRedisDel.mockResolvedValue(1)
  })

  describe('getServiceToken (via serviceClient.get)', () => {
    it('checks Valkey cache first, misses, acquires lock, fetches token via clientCredentialsGrant, then caches in Valkey', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/test')

      // Should check Valkey for cached token
      expect(mockRedisGet).toHaveBeenCalledWith('bcordes:service-token')
      // Cache miss → acquire lock → fetch via OIDC
      expect(mockRedisSet).toHaveBeenCalledWith(
        'bcordes:lock:service-token',
        '1',
        'EX',
        expect.any(Number),
        'NX',
      )
      expect(mockDiscovery).toHaveBeenCalledOnce()
      expect(mockClientCredentialsGrant).toHaveBeenCalledOnce()
      // Should store token in Valkey
      expect(mockRedisSet).toHaveBeenCalledWith(
        'bcordes:service-token',
        expect.stringContaining('tok-initial'),
        'EX',
        expect.any(Number),
      )
      // Should release the lock
      expect(mockRedisDel).toHaveBeenCalledWith('bcordes:lock:service-token')
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
        'Bearer tok-initial',
      )
    })

    it('returns cached token from Valkey without calling clientCredentialsGrant', async () => {
      // Valkey returns a cached token (valid, not expired)
      const cachedPayload = JSON.stringify({
        accessToken: 'tok-cached',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      })
      mockRedisGet.mockResolvedValue(cachedPayload)

      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/first')
      await client.get('/second')

      // Should have checked Valkey
      expect(mockRedisGet).toHaveBeenCalledWith('bcordes:service-token')
      // Should NOT have called clientCredentialsGrant since Valkey had a valid token
      expect(mockClientCredentialsGrant).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      // Both calls should use the cached token
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
        'Bearer tok-cached',
      )
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
        'Bearer tok-cached',
      )
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

  describe('Valkey distributed lock for concurrent refresh', () => {
    it('acquires lock with EX + NX before refreshing token', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/test')

      // Should attempt to acquire the lock key with EX + NX
      expect(mockRedisSet).toHaveBeenCalledWith(
        'bcordes:lock:service-token',
        '1',
        'EX',
        expect.any(Number),
        'NX',
      )
    })

    it('releases lock after successful refresh', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/test')

      expect(mockRedisDel).toHaveBeenCalledWith('bcordes:lock:service-token')
    })

    it('polls for cached token when lock is held by another instance', async () => {
      // First set call (lock acquisition) returns null — lock already held
      mockRedisSet.mockResolvedValueOnce(null)

      // Poll: first attempt returns null, second returns fresh token
      const freshPayload = JSON.stringify({
        accessToken: 'tok-from-other-instance',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      })
      mockRedisGet
        .mockResolvedValueOnce(null) // initial cache check
        .mockResolvedValueOnce(null) // first poll attempt
        .mockResolvedValueOnce(freshPayload) // second poll attempt

      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/test')

      // Should NOT have called clientCredentialsGrant (another instance did the refresh)
      expect(mockClientCredentialsGrant).not.toHaveBeenCalled()
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
        'Bearer tok-from-other-instance',
      )
    })
  })

  describe('401 retry', () => {
    it('deletes cached token from Valkey on 401, fetches fresh token, and retries', async () => {
      mockClientCredentialsGrant
        .mockResolvedValueOnce(tokenResponse('tok-stale'))
        .mockResolvedValueOnce(tokenResponse('tok-refreshed'))

      fetchMock
        .mockResolvedValueOnce(jsonResponse({ title: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      const client = await loadModule()
      await client.get('/protected')

      // Should delete the cached token from Valkey on 401
      expect(mockRedisDel).toHaveBeenCalledWith('bcordes:service-token')
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
})
