// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// parseUserFromToken tests (static, no mocks needed)
// ---------------------------------------------------------------------------

import { parseUserFromToken } from './oidc'

/** Build a minimal JWT (header.payload.signature) from a claims object. */
function fakeJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  )
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${header}.${payload}.sig`
}

describe('parseUserFromToken', () => {
  it('maps standard claims to User fields', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'user-123',
        name: 'Bryan Cordes',
        email: 'bryan@example.com',
        role: 'admin',
        org_id: 'org-1',
        org_name: 'Acme Corp',
      }),
    )

    expect(user).toEqual({
      id: 'user-123',
      name: 'Bryan Cordes',
      email: 'bryan@example.com',
      roles: ['admin'],
      permissions: [],
      tenantId: 'org-1',
      tenantName: 'Acme Corp',
    })
  })

  it('preserves an array role claim as-is', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        name: 'Test',
        email: 'test@test.com',
        role: ['admin', 'manager'],
      }),
    )

    expect(user.roles).toEqual(['admin', 'manager'])
  })

  it('defaults roles to [] when role claim is missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        name: 'Test',
        email: 'test@test.com',
      }),
    )

    expect(user.roles).toEqual([])
  })

  it('falls back to preferred_username when name is missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        preferred_username: 'bcordes',
        email: 'b@example.com',
      }),
    )

    expect(user.name).toBe('bcordes')
  })

  it('falls back to email when name and preferred_username are missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        email: 'fallback@example.com',
      }),
    )

    expect(user.name).toBe('fallback@example.com')
  })

  it('falls back to "User" when name, preferred_username, and email are all missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
      }),
    )

    expect(user.name).toBe('User')
  })

  it('throws on a string that is not a three-part JWT', () => {
    expect(() => parseUserFromToken('not-a-jwt')).toThrow(
      'Token is not a valid JWT',
    )
    expect(() => parseUserFromToken('two.parts')).toThrow(
      'Token is not a valid JWT',
    )
    expect(() => parseUserFromToken('a.b.c.d')).toThrow(
      'Token is not a valid JWT',
    )
  })

  it('defaults tenantId and tenantName to empty string when org claims are missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        name: 'Test',
        email: 'test@test.com',
      }),
    )

    expect(user.tenantId).toBe('')
    expect(user.tenantName).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Network-facing exports (require mocking openid-client)
// ---------------------------------------------------------------------------

// Shared mock stubs — vi.hoisted ensures they exist before vi.mock runs.
const {
  mockDiscovery,
  mockAuthorizationCodeGrant,
  mockRefreshTokenGrant,
  mockFetchUserInfo,
  mockBuildAuthorizationUrl,
  mockCalculatePKCECodeChallenge,
} = vi.hoisted(() => ({
  mockDiscovery: vi.fn(),
  mockAuthorizationCodeGrant: vi.fn(),
  mockRefreshTokenGrant: vi.fn(),
  mockFetchUserInfo: vi.fn(),
  mockBuildAuthorizationUrl: vi.fn(),
  mockCalculatePKCECodeChallenge: vi.fn(),
}))

vi.mock('openid-client', () => ({
  discovery: mockDiscovery,
  authorizationCodeGrant: mockAuthorizationCodeGrant,
  refreshTokenGrant: mockRefreshTokenGrant,
  fetchUserInfo: mockFetchUserInfo,
  buildAuthorizationUrl: mockBuildAuthorizationUrl,
  calculatePKCECodeChallenge: mockCalculatePKCECodeChallenge,
  allowInsecureRequests: Symbol('allowInsecureRequests'),
  randomPKCECodeVerifier: vi.fn(() => 'random-verifier'),
  randomState: vi.fn(() => 'random-state'),
}))

/** Helper: get a fresh module import (resets configPromise cache). */
async function freshImport() {
  vi.resetModules()
  // Re-register the openid-client mock after resetModules
  vi.doMock('openid-client', () => ({
    discovery: mockDiscovery,
    authorizationCodeGrant: mockAuthorizationCodeGrant,
    refreshTokenGrant: mockRefreshTokenGrant,
    fetchUserInfo: mockFetchUserInfo,
    buildAuthorizationUrl: mockBuildAuthorizationUrl,
    calculatePKCECodeChallenge: mockCalculatePKCECodeChallenge,
    allowInsecureRequests: Symbol('allowInsecureRequests'),
    randomPKCECodeVerifier: vi.fn(() => 'random-verifier'),
    randomState: vi.fn(() => 'random-state'),
  }))
  return await import('./oidc')
}

/** Fake OIDC Configuration object returned by discovery. */
function fakeConfig() {
  return {
    serverMetadata: () => ({
      end_session_endpoint: 'https://auth.example.com/connect/endsession',
    }),
  }
}

/** Fake token set returned by authorizationCodeGrant / refreshTokenGrant. */
function fakeTokenSet(overrides: Record<string, unknown> = {}) {
  return {
    access_token: 'at-123',
    refresh_token: 'rt-456',
    id_token: 'id-789',
    expires_in: 3600,
    claims: () => ({ sub: 'user-sub-1' }),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getAuthorizationUrl
// ---------------------------------------------------------------------------

describe('getAuthorizationUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('throws when OIDC_ISSUER is missing', async () => {
    vi.stubEnv('OIDC_ISSUER', '')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    const mod = await freshImport()
    await expect(
      mod.getAuthorizationUrl('state-1', 'verifier-1'),
    ).rejects.toThrow('OIDC_ISSUER environment variable is not set')
  })

  it('throws when OIDC_CLIENT_ID is missing', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', '')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    const mod = await freshImport()
    await expect(
      mod.getAuthorizationUrl('state-1', 'verifier-1'),
    ).rejects.toThrow('OIDC_CLIENT_ID environment variable is not set')
  })

  it('throws when OIDC_REDIRECT_URI is missing', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', '')

    const mod = await freshImport()
    await expect(
      mod.getAuthorizationUrl('state-1', 'verifier-1'),
    ).rejects.toThrow('OIDC_REDIRECT_URI environment variable is not set')
  })

  it('calls discovery, calculatePKCECodeChallenge, buildAuthorizationUrl and returns url.href', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_CLIENT_SECRET', 'my-secret')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    const config = fakeConfig()
    mockDiscovery.mockResolvedValue(config)
    mockCalculatePKCECodeChallenge.mockResolvedValue('challenge-abc')
    mockBuildAuthorizationUrl.mockReturnValue(
      new URL('https://auth.example.com/authorize?foo=bar'),
    )

    const mod = await freshImport()
    const result = await mod.getAuthorizationUrl('state-1', 'verifier-1')

    expect(mockDiscovery).toHaveBeenCalledWith(
      new URL('https://auth.example.com'),
      'my-client',
      'my-secret',
      undefined,
      expect.anything(),
    )
    expect(mockCalculatePKCECodeChallenge).toHaveBeenCalledWith('verifier-1')
    expect(mockBuildAuthorizationUrl).toHaveBeenCalledWith(config, {
      redirect_uri: 'http://localhost:3000/auth/callback',
      scope:
        'openid profile email roles offline_access inquiries.read inquiries.write notifications.read notifications.write',
      state: 'state-1',
      code_challenge: 'challenge-abc',
      code_challenge_method: 'S256',
    })
    expect(result).toBe('https://auth.example.com/authorize?foo=bar')
  })
})

// ---------------------------------------------------------------------------
// exchangeCode
// ---------------------------------------------------------------------------

describe('exchangeCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('calls authorizationCodeGrant and returns TokenResult', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_CLIENT_SECRET', 'my-secret')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    const config = fakeConfig()
    mockDiscovery.mockResolvedValue(config)

    const tokens = fakeTokenSet()
    mockAuthorizationCodeGrant.mockResolvedValue(tokens)

    const mod = await freshImport()
    const result = await mod.exchangeCode(
      'auth-code',
      'verifier-1',
      'http://localhost:3000/auth/callback?code=auth-code&state=s1',
      's1',
    )

    expect(mockAuthorizationCodeGrant).toHaveBeenCalledWith(
      config,
      new URL('http://localhost:3000/auth/callback?code=auth-code&state=s1'),
      {
        pkceCodeVerifier: 'verifier-1',
        expectedState: 's1',
      },
    )
    expect(result).toEqual({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      idToken: 'id-789',
      expiresIn: 3600,
      subject: 'user-sub-1',
    })
  })

  it('defaults optional token fields when missing', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue(fakeConfig())
    mockAuthorizationCodeGrant.mockResolvedValue({
      access_token: 'at-only',
      refresh_token: undefined,
      id_token: undefined,
      expires_in: undefined,
      claims: () => ({}),
    })

    const mod = await freshImport()
    const result = await mod.exchangeCode(
      'c',
      'v',
      'http://localhost:3000/auth/callback?code=c',
      's',
    )

    expect(result.refreshToken).toBe('')
    expect(result.idToken).toBe('')
    expect(result.expiresIn).toBe(0)
    expect(result.subject).toBe('')
  })
})

// ---------------------------------------------------------------------------
// refreshToken
// ---------------------------------------------------------------------------

describe('refreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('calls refreshTokenGrant and returns TokenResult', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    const config = fakeConfig()
    mockDiscovery.mockResolvedValue(config)
    mockRefreshTokenGrant.mockResolvedValue(fakeTokenSet())

    const mod = await freshImport()
    const result = await mod.refreshToken('rt-456')

    expect(mockRefreshTokenGrant).toHaveBeenCalledWith(config, 'rt-456')
    expect(result).toEqual({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      idToken: 'id-789',
      expiresIn: 3600,
      subject: 'user-sub-1',
    })
  })

  it('defaults subject, idToken, and expiresIn when claims/fields are missing', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue(fakeConfig())
    mockRefreshTokenGrant.mockResolvedValue({
      access_token: 'at-new',
      refresh_token: 'rt-new',
      id_token: undefined,
      expires_in: undefined,
      claims: () => ({}),
    })

    const mod = await freshImport()
    const result = await mod.refreshToken('rt-old')

    expect(result.subject).toBe('')
    expect(result.idToken).toBe('')
    expect(result.expiresIn).toBe(0)
  })

  it('falls back to original refresh token when response omits refresh_token', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue(fakeConfig())
    mockRefreshTokenGrant.mockResolvedValue(
      fakeTokenSet({ refresh_token: undefined }),
    )

    const mod = await freshImport()
    const result = await mod.refreshToken('original-rt')

    expect(result.refreshToken).toBe('original-rt')
  })
})

// ---------------------------------------------------------------------------
// getLogoutUrl
// ---------------------------------------------------------------------------

describe('getLogoutUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('uses end_session_endpoint when present', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue(fakeConfig())

    const mod = await freshImport()
    const url = await mod.getLogoutUrl('id-token-hint', 'http://localhost:3000')

    expect(url).toContain('https://auth.example.com/connect/endsession')
    expect(url).toContain('id_token_hint=id-token-hint')
    expect(url).toContain(
      'post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000',
    )
  })

  it('falls back to OIDC_ISSUER + /connect/logout when end_session_endpoint is absent', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com/')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue({
      serverMetadata: () => ({
        end_session_endpoint: undefined,
      }),
    })

    const mod = await freshImport()
    const url = await mod.getLogoutUrl()

    expect(url).toBe('https://auth.example.com/connect/logout')
  })

  it('appends id_token_hint and post_logout_redirect_uri params', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue(fakeConfig())

    const mod = await freshImport()
    const url = await mod.getLogoutUrl('my-id-token', 'https://app.example.com')

    const parsed = new URL(url)
    expect(parsed.searchParams.get('id_token_hint')).toBe('my-id-token')
    expect(parsed.searchParams.get('post_logout_redirect_uri')).toBe(
      'https://app.example.com',
    )
  })

  it('omits params when not provided', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue(fakeConfig())

    const mod = await freshImport()
    const url = await mod.getLogoutUrl()

    const parsed = new URL(url)
    expect(parsed.searchParams.has('id_token_hint')).toBe(false)
    expect(parsed.searchParams.has('post_logout_redirect_uri')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// fetchUserProfile
// ---------------------------------------------------------------------------

describe('fetchUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('calls fetchUserInfo with access token and expected subject and returns User', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    const config = fakeConfig()
    mockDiscovery.mockResolvedValue(config)
    mockFetchUserInfo.mockResolvedValue({
      sub: 'user-sub-1',
      name: 'Bryan Cordes',
      email: 'bryan@example.com',
      role: ['admin'],
      org_id: 'org-1',
      org_name: 'Org Name',
    })

    const mod = await freshImport()
    const user = await mod.fetchUserProfile('at-123', 'user-sub-1')

    expect(mockFetchUserInfo).toHaveBeenCalledWith(
      config,
      'at-123',
      'user-sub-1',
    )
    expect(user).toEqual({
      id: 'user-sub-1',
      name: 'Bryan Cordes',
      email: 'bryan@example.com',
      roles: ['admin'],
      permissions: [],
      tenantId: 'org-1',
      tenantName: 'Org Name',
    })
  })
})

// ---------------------------------------------------------------------------
// configPromise cache behavior
// ---------------------------------------------------------------------------

describe('configPromise cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('reuses cached config on subsequent calls', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue(fakeConfig())
    mockCalculatePKCECodeChallenge.mockResolvedValue('challenge')
    mockBuildAuthorizationUrl.mockReturnValue(
      new URL('https://auth.example.com/authorize'),
    )
    mockFetchUserInfo.mockResolvedValue({ sub: 'u1', name: 'U', email: '' })

    const mod = await freshImport()

    // First call triggers discovery
    await mod.getAuthorizationUrl('s1', 'v1')
    // Second call should reuse cached config
    await mod.fetchUserProfile('at', 'u1')

    expect(mockDiscovery).toHaveBeenCalledTimes(1)
  })

  it('does not pass allowInsecureRequests in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_CLIENT_SECRET', 'my-secret')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery.mockResolvedValue(fakeConfig())
    mockCalculatePKCECodeChallenge.mockResolvedValue('challenge')
    mockBuildAuthorizationUrl.mockReturnValue(
      new URL('https://auth.example.com/authorize'),
    )

    const mod = await freshImport()
    await mod.getAuthorizationUrl('s1', 'v1')

    // In production, the 5th argument to discovery should be undefined
    expect(mockDiscovery).toHaveBeenCalledWith(
      new URL('https://auth.example.com'),
      'my-client',
      'my-secret',
      undefined,
      undefined,
    )
  })

  it('resets configPromise to null on discovery failure, allowing retry', async () => {
    vi.stubEnv('OIDC_ISSUER', 'https://auth.example.com')
    vi.stubEnv('OIDC_CLIENT_ID', 'my-client')
    vi.stubEnv('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback')

    mockDiscovery
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(fakeConfig())
    mockCalculatePKCECodeChallenge.mockResolvedValue('challenge')
    mockBuildAuthorizationUrl.mockReturnValue(
      new URL('https://auth.example.com/authorize'),
    )

    const mod = await freshImport()

    // First call fails
    await expect(mod.getAuthorizationUrl('s1', 'v1')).rejects.toThrow(
      'network error',
    )

    // Second call should retry discovery (configPromise was reset to null)
    const url = await mod.getAuthorizationUrl('s2', 'v2')
    expect(mockDiscovery).toHaveBeenCalledTimes(2)
    expect(url).toBe('https://auth.example.com/authorize')
  })
})
