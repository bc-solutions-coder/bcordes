import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { inquiriesSubmit, usersGetCurrentUser } from '@bc-solutions-coder/sdk'
import { getValkey } from '@bcordes/valkey'
import { getBff } from '@bcordes/auth/bff'
import { createMockSession } from '@bcordes/auth/testing'
import { startTestValkey } from '../../../scripts/test-fixtures/valkey'
import { createWallowClient, getInquiryService } from './index'

const requestContext = vi.hoisted(() => ({
  request: new Request('https://app.example/dashboard'),
  setResponseHeader: vi.fn(),
}))
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => requestContext.request,
  setResponseHeader: requestContext.setResponseHeader,
}))
let server: ReturnType<typeof startTestValkey> | undefined
beforeAll(async () => {
  server = startTestValkey()
  for (const [key, value] of Object.entries({
    REDIS_URL: server.url,
    COOKIE_PASSWORD: 'unit-only-persistent-session-password-32-characters',
    COOKIE_NAME: 'unit_session',
    COOKIE_SECURE: 'true',
    OIDC_ISSUER: 'https://identity.example',
    OIDC_CLIENT_ID: 'unit-client',
    OIDC_CLIENT_SECRET: 'synthetic-secret',
    OIDC_REDIRECT_URI: 'https://app.example/bff/callback',
    OIDC_POST_LOGOUT_REDIRECT_URI: 'https://app.example/',
    BFF_API_BASE_URL: 'https://backend.example',
    BFF_APP_ID: 'unit-wallow',
    OIDC_SERVICE_CLIENT_ID: 'inquiry-service',
    OIDC_SERVICE_CLIENT_SECRET: 'inquiry-secret',
    OIDC_SERVICE_SCOPES: 'inquiries.write',
  }))
    vi.stubEnv(key, value)
  await getValkey().ping()
}, 30_000)
afterAll(() => {
  try {
    getValkey().disconnect()
  } finally {
    server?.stop()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  }
})
beforeEach(() => {
  requestContext.request = new Request('https://app.example/dashboard')
  requestContext.setResponseHeader.mockClear()
})

it('uses the public client factory to fetch each request session profile', async () => {
  const backend = vi.fn<typeof fetch>((input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    expect(request.url).toBe('https://backend.example/v1/identity/users/me')
    return Promise.resolve(
      Response.json({ id: request.headers.get('authorization') }),
    )
  })
  vi.stubGlobal('fetch', backend)
  const bff = getBff()
  for (const token of ['alice-token', 'bob-token']) {
    const ref = await bff.store.write(
      createMockSession({ sessionId: token, accessToken: token }),
    )
    requestContext.request = new Request('https://app.example/dashboard', {
      headers: { cookie: `${bff.config.cookieName}=${ref}` },
    })
    const sdk = await createWallowClient()
    const profile = await usersGetCurrentUser({ client: sdk.client })
    expect(profile.id).toBe(`Bearer ${token}`)
    await bff.store.destroy(ref)
  }
  expect(backend).toHaveBeenCalledTimes(2)
})

it('reuses a usable public service client for authenticated inquiry submissions', async () => {
  const operations: Array<{
    authorization: string | null
    method: string
    body: unknown
  }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, init) => {
      const request =
        input instanceof Request ? input : new Request(input, init)
      if (
        request.url ===
        'https://identity.example/.well-known/openid-configuration'
      )
        return Response.json({
          issuer: 'https://identity.example',
          token_endpoint: 'https://identity.example/connect/token',
          authorization_endpoint: 'https://identity.example/connect/authorize',
          jwks_uri: 'https://identity.example/jwks',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
        })
      if (request.url === 'https://identity.example/connect/token') {
        const body = new URLSearchParams(await request.text())
        expect(request.method).toBe('POST')
        expect(body.get('grant_type')).toBe('client_credentials')
        expect(body.get('client_id')).toBe('inquiry-service')
        expect(body.get('client_secret')).toBe('inquiry-secret')
        expect(body.get('scope')).toBe('inquiries.write')
        return Response.json({
          access_token: 'service-token',
          token_type: 'Bearer',
          expires_in: 3600,
        })
      }
      expect(request.url).toBe('https://backend.example/v1/inquiries')
      const body: unknown = await request.json()
      operations.push({
        authorization: request.headers.get('authorization'),
        method: request.method,
        body,
      })
      return Response.json({ id: `inquiry-${operations.length}` })
    }),
  )
  for (const [index, name] of ['First Guest', 'Second Guest'].entries()) {
    const body = {
      name,
      email: 'guest@example.com',
      phone: '',
      company: null,
      projectType: 'Frontend',
      budgetRange: '$5k-$15k',
      timeline: '1-3 months',
      message: 'Please build our application.',
    }
    const response = await inquiriesSubmit({
      client: getInquiryService().client,
      body,
    })
    expect(response.id).toBe(`inquiry-${index + 1}`)
    expect(operations[index]).toEqual({
      authorization: 'Bearer service-token',
      method: 'POST',
      body,
    })
  }
})
