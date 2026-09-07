// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { getValkey } from '@bcordes/valkey'
import { startTestValkey } from '../../../scripts/test-fixtures/valkey'
import { startInstance } from './start'

let server: ReturnType<typeof startTestValkey> | undefined
beforeAll(async () => {
  server = startTestValkey()
  for (const [key, value] of Object.entries({
    REDIS_URL: server.url,
    COOKIE_PASSWORD: 'unit-only-persistent-session-password-32-characters',
    COOKIE_SECURE: 'true',
    OIDC_ISSUER: 'https://identity.example',
    OIDC_CLIENT_ID: 'unit-client',
    OIDC_CLIENT_SECRET: 'synthetic-secret',
    OIDC_REDIRECT_URI: 'https://app.example/bff/callback',
    OIDC_POST_LOGOUT_REDIRECT_URI: 'https://app.example/',
    BFF_API_BASE_URL: 'https://backend.example',
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
  vi.unstubAllEnvs()
})

async function requestThroughMiddleware(
  request: Request,
  downstream = () => Promise.resolve(new Response('page content')),
) {
  const { requestMiddleware = [] } = await startInstance.getOptions()
  const pathname = new URL(request.url).pathname
  async function next(index: number): Promise<{
    request: Request
    pathname: string
    context: undefined
    response: Response
  }> {
    const middleware = requestMiddleware[index]?.options.server
    if (!middleware)
      return {
        request,
        pathname,
        context: undefined,
        response: await downstream(),
      }
    const result: unknown = await Reflect.apply(middleware, undefined, [
      {
        request,
        pathname,
        context: undefined,
        handlerType: 'router',
        next: () => next(index + 1),
      },
    ])
    if (result instanceof Response)
      return { request, pathname, context: undefined, response: result }
    if (
      typeof result === 'object' &&
      result !== null &&
      'response' in result &&
      result.response instanceof Response
    ) {
      return {
        request,
        pathname,
        context: undefined,
        response: result.response,
      }
    }
    throw new Error('Request middleware did not return a response')
  }
  return (await next(0)).response
}

it.each([
  '/api/private',
  '/api/events',
  '/api/events?subscribe=Notifications',
  '/api/events?subscribe=Notifications,Inquiries&extra=1',
])('does not expose unsupported API request %s', async (path) => {
  const downstream = vi.fn(() => Promise.resolve(new Response('private data')))
  const response = await requestThroughMiddleware(
    new Request(`https://app.example${path}`),
    downstream,
  )
  expect(response.status).toBe(404)
  expect(await response.text()).toBe('Not found')
  expect(downstream).not.toHaveBeenCalled()
  expect(response.headers.get('x-frame-options')).toBe('DENY')
})

it.each(['POST', 'PUT', 'DELETE'])(
  'rejects a cross-origin %s before the page handler',
  async (method) => {
    const downstream = vi.fn(() => Promise.resolve(new Response('changed')))
    const response = await requestThroughMiddleware(
      new Request('https://app.example/action', {
        method,
        headers: { origin: 'https://other.example' },
      }),
      downstream,
    )
    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden')
    expect(downstream).not.toHaveBeenCalled()
  },
)

it('rejects cross-origin logout before delegating to the session handler', async () => {
  const response = await requestThroughMiddleware(
    new Request('https://app.example/bff/logout', {
      method: 'POST',
      headers: { origin: 'https://other.example' },
    }),
  )
  expect(response.status).toBe(403)
  expect(await response.text()).toBe('Forbidden')
})

it.each(['GET', 'HEAD', 'OPTIONS', 'POST'])(
  'preserves a supported %s response with security headers',
  async (method) => {
    const response = await requestThroughMiddleware(
      new Request('https://app.example/page', {
        method,
        headers: { origin: 'https://app.example' },
      }),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('page content')
    expect(response.headers.get('content-security-policy')).toContain(
      "frame-ancestors 'none'",
    )
  },
)

it.each([
  '/api/health',
  '/source.map',
  '/favicon.ico',
  '/node_modules/resource',
  '/@vite/client',
  '/src/resource',
])('preserves serving of %s', async (path) => {
  const response = await requestThroughMiddleware(
    new Request(`https://app.example${path}`),
  )
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('page content')
})

it.each([404, 503])('preserves a downstream %s response', async (status) => {
  const response = await requestThroughMiddleware(
    new Request('https://app.example/page'),
    () => Promise.resolve(new Response('downstream error', { status })),
  )
  expect(response.status).toBe(status)
  expect(await response.text()).toBe('downstream error')
})

it('propagates a downstream failure to framework error recovery', async () => {
  const failure = new Error('render failed')
  await expect(
    requestThroughMiddleware(new Request('https://app.example/page'), () =>
      Promise.reject(failure),
    ),
  ).rejects.toBe(failure)
})

it('requires authentication for the supported event subscription', async () => {
  const downstream = vi.fn(() =>
    Promise.resolve(new Response('private events')),
  )
  const response = await requestThroughMiddleware(
    new Request(
      'https://app.example/api/events?subscribe=Notifications,Inquiries',
    ),
    downstream,
  )
  expect(response.status).toBe(401)
  expect(downstream).not.toHaveBeenCalled()
})

it('lets the BFF reject an unknown authentication endpoint without reaching a page handler', async () => {
  const downstream = vi.fn(() =>
    Promise.resolve(new Response('unexpected page')),
  )
  const response = await requestThroughMiddleware(
    new Request('https://app.example/bff/unknown'),
    downstream,
  )
  expect(response.status).toBe(404)
  expect(downstream).not.toHaveBeenCalled()
})
