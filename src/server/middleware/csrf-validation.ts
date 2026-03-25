import { timingSafeEqual } from 'node:crypto'
import { getSession } from '~/lib/auth/session'
import { getRequestHeader, defineEventHandler, createError } from 'h3'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * CSRF validation middleware.
 * Validates x-csrf-token header on state-changing requests (POST/PUT/PATCH/DELETE).
 * Skips validation for safe methods and unauthenticated requests.
 */
export function validateCsrfToken() {
  return defineEventHandler(async (event) => {
    const method = event.method?.toUpperCase() ?? 'GET'
    if (SAFE_METHODS.has(method)) return

    const session = await getSession()
    // Skip CSRF check for unauthenticated requests (e.g. anonymous inquiry submission)
    if (!session?.csrfToken) return

    const headerToken = getRequestHeader(event, 'x-csrf-token')
    if (!headerToken || !safeEqual(headerToken, session.csrfToken)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid CSRF token',
      })
    }
  })
}

export default validateCsrfToken()
