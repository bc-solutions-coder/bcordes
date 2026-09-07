import { createMiddleware, createStart } from '@tanstack/react-start'
import logger from '@bcordes/logger'
import { applySecurityHeaders } from '@bcordes/server/security-headers'
import { getBff } from '@bcordes/auth/bff'

const log = logger.child({ module: 'http' })

function resolveServerFnPath(path: string): string {
  if (!path.startsWith('/_serverFn/')) return path
  try {
    const encoded = path.slice('/_serverFn/'.length)
    const json = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    const { file, export: exp } = JSON.parse(json) as {
      file: string
      export: string
    }
    const module = file
      .replace(/^\/@id\/src\/server-fns\//, '')
      .replace(/\.ts\?.*$/, '')
    const fn = exp.replace(/_createServerFn_handler$/, '')
    return `/_serverFn/${module}.${fn}`
  } catch {
    return path
  }
}

const SKIP_PREFIXES = ['/node_modules/', '/@', '/src/', '/api/health']

const requestLogger = createMiddleware().server(async ({ request, next }) => {
  const start = Date.now()
  const method = request.method
  const url = new URL(request.url)
  const path = url.pathname

  if (
    path.endsWith('.map') ||
    path.endsWith('.ico') ||
    SKIP_PREFIXES.some((p) => path.startsWith(p))
  )
    return next()

  const label = resolveServerFnPath(path)

  try {
    const result = await next()
    const ms = Date.now() - start
    const status = result.response.status
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

    log[level]({ method, status, ms }, `${method} ${label}`)

    return result
  } catch (err) {
    const ms = Date.now() - start
    log.error({ method, err, ms }, `${method} ${label}`)
    throw err
  }
})

const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next()
  return { ...result, response: applySecurityHeaders(result.response) }
})

const wallow = createMiddleware().server(async ({ request, next }) => {
  const path = new URL(request.url).pathname
  const bff = getBff()
  if (path === '/bff' || path.startsWith('/bff/')) return bff.handleBff(request)
  if (path === '/api/events' && request.method === 'GET') {
    const params = new URL(request.url).searchParams
    if (
      params.size !== 1 ||
      params.get('subscribe') !== 'Notifications,Inquiries'
    )
      return new Response('Not found', { status: 404 })
    return bff.handleApi(request)
  }
  if (path.startsWith('/api/') && path !== '/api/health')
    return new Response('Not found', { status: 404 })
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (
      request.headers.get('origin') !== new URL(bff.config.redirectUri).origin
    ) {
      return new Response('Forbidden', { status: 403 })
    }
  }
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [requestLogger, securityHeaders, wallow],
}))
