import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import {
  notificationsMarkAsRead,
  usersGetCurrentUser,
} from '@bc-solutions-coder/sdk'
import { getValkey } from '@bcordes/valkey'
import { startTestValkey } from '../../../scripts/test-fixtures/valkey'
import { getBff } from './bff'
import { getSession, hasSessionReference } from './session'
import { createRequestSdk } from './sdk'
import { createMockAdminSession, createMockSession } from './testing'
import { getAuthUser, requireAdmin, requireAuth } from './middleware'

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
    BFF_APP_ID: 'unit-app',
  }))
    vi.stubEnv(key, value)
  await getValkey().ping()
}, 30_000)

afterAll(() => {
  if (server) {
    try {
      getValkey().disconnect()
    } finally {
      server.stop()
    }
  }
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

beforeEach(() => {
  requestContext.request = new Request('https://app.example/dashboard')
  requestContext.setResponseHeader.mockClear()
})

it('finds a persisted session from its cookie and stops finding it after destruction', async () => {
  expect(hasSessionReference()).toBe(false)
  expect(await getSession()).toBeNull()
  const bff = getBff()
  const session = createMockSession({
    sessionId: 'persistent',
    csrfToken: 'csrf',
  })
  const ref = await bff.store.write(session)
  requestContext.request = new Request('https://app.example/dashboard', {
    headers: { cookie: `${bff.config.cookieName}=${ref}` },
  })
  expect(hasSessionReference()).toBe(true)
  expect(await getSession()).toMatchObject({
    sessionId: 'persistent',
    csrfToken: 'csrf',
  })
  await bff.store.destroy(ref)
  expect(await getSession()).toBeNull()
})

it.each([
  [
    {
      id: 'customer',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
    },
    'Session name',
    'Ada Lovelace',
  ],
  [
    { id: 'customer', email: 'ada@example.test' },
    'Session name',
    'Session name',
  ],
  [{ id: 'customer', email: 'ada@example.test' }, '', 'ada@example.test'],
  [{ id: 'customer' }, '', 'User'],
])(
  'returns the verified customer profile with the supported name fallback',
  async (profile, sessionName, expectedName) => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(Response.json(profile))),
    )
    const bff = getBff()
    const ref = await bff.store.write(
      createMockSession({ user: { sub: 'customer', name: sessionName } }),
    )
    requestContext.request = new Request('https://app.example/dashboard', {
      headers: { cookie: `${bff.config.cookieName}=${ref}` },
    })
    expect(await getAuthUser()).toEqual({
      id: 'customer',
      name: expectedName,
      email: 'email' in profile ? profile.email : '',
      roles: [],
      permissions: [],
      tenantId: '',
      tenantName: '',
    })
    await bff.store.destroy(ref)
  },
)

it.each([{}, { id: 'someone-else' }])(
  'does not authenticate a missing or mismatched profile identity',
  async (profile) => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(Response.json(profile))),
    )
    const bff = getBff()
    const ref = await bff.store.write(
      createMockSession({ user: { sub: 'customer' } }),
    )
    requestContext.request = new Request('https://app.example/dashboard', {
      headers: { cookie: `${bff.config.cookieName}=${ref}` },
    })
    expect(await getAuthUser()).toBeNull()
    await bff.store.destroy(ref)
  },
)

it('denies staff access to a verified customer without inquiry-read permission', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({ id: 'customer', permissions: ['InquiriesWrite'] }),
      ),
    ),
  )
  const bff = getBff()
  const ref = await bff.store.write(
    createMockSession({ user: { sub: 'customer' } }),
  )
  requestContext.request = new Request('https://app.example/dashboard', {
    headers: { cookie: `${bff.config.cookieName}=${ref}` },
  })
  await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  await bff.store.destroy(ref)
})

it('redirects an unauthenticated request back through login', async () => {
  await expect(
    requireAuth('/dashboard/inquiries?status=open'),
  ).rejects.toMatchObject({
    options: {
      href: '/bff/login?returnTo=%2Fdashboard%2Finquiries%3Fstatus%3Dopen',
    },
  })
})

it('allows verified staff with inquiry-read permission', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          id: 'test-admin-456',
          permissions: ['InquiriesRead', 'InquiriesWrite'],
          roles: ['admin'],
        }),
      ),
    ),
  )
  const bff = getBff()
  const ref = await bff.store.write(createMockAdminSession())
  requestContext.request = new Request('https://app.example/dashboard', {
    headers: { cookie: `${bff.config.cookieName}=${ref}` },
  })
  expect(await requireAdmin()).toMatchObject({
    id: 'test-admin-456',
    permissions: ['InquiriesRead', 'InquiriesWrite'],
  })
  await bff.store.destroy(ref)
})

it('authorizes a notification write using the persisted session CSRF token', async () => {
  const backend = vi.fn<typeof fetch>((input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    expect(request.method).toBe('POST')
    expect(request.headers.get('authorization')).toBe(
      'Bearer notification-token',
    )
    return Promise.resolve(new Response(null, { status: 204 }))
  })
  vi.stubGlobal('fetch', backend)
  const bff = getBff()
  const ref = await bff.store.write(
    createMockSession({
      sessionId: 'write',
      accessToken: 'notification-token',
      csrfToken: 'notification-csrf',
    }),
  )
  requestContext.request = new Request('https://app.example/dashboard', {
    headers: {
      cookie: `${bff.config.cookieName}=${ref}`,
      'x-forwarded-proto': 'https',
      'x-forwarded-for': '192.0.2.10',
    },
  })
  const sdk = await createRequestSdk()
  await notificationsMarkAsRead({
    client: sdk.client,
    path: { id: 'a1b2c3d4-1111-4222-8333-123456789abc' },
  })
  expect(backend).toHaveBeenCalledOnce()
  await bff.store.destroy(ref)
})

it('rejects an SDK profile request without a session instead of contacting the backend', async () => {
  const backend = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json({ id: 'unexpected' })),
  )
  vi.stubGlobal('fetch', backend)
  const sdk = await createRequestSdk()
  await expect(
    usersGetCurrentUser({ client: sdk.client }),
  ).rejects.toMatchObject({ status: 401 })
  expect(backend).not.toHaveBeenCalled()
})

it('refuses to configure persistent authentication without a storage URL', async () => {
  const previous = process.env.REDIS_URL
  vi.stubEnv('REDIS_URL', '   ')
  try {
    vi.resetModules()
    const { getBff: freshBff } = await import('./bff')
    expect(() => freshBff()).toThrow(
      'REDIS_URL is required for persistent SDK sessions',
    )
  } finally {
    vi.stubEnv('REDIS_URL', previous)
  }
})

it('refuses insecure session cookies in production', async () => {
  const previousEnvironment = process.env.NODE_ENV
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('COOKIE_SECURE', 'false')
  try {
    vi.resetModules()
    const { getBff: freshBff } = await import('./bff')
    expect(() => freshBff()).toThrow('COOKIE_SECURE must be true in production')
  } finally {
    vi.stubEnv('NODE_ENV', previousEnvironment)
    vi.stubEnv('COOKIE_SECURE', 'true')
  }
})
