import { createMiddleware, createStart } from '@tanstack/react-start'
import logger from '@/lib/logger'

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

export const startInstance = createStart(() => ({
  requestMiddleware: [requestLogger],
}))
