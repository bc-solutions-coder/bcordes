import { timingSafeEqual } from 'node:crypto'
import { createError, defineEventHandler, getRequestHeader } from 'h3'
import { getSession } from '@bcordes/auth/session'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Validate x-csrf-token except for GET, HEAD, OPTIONS or sessions without csrfToken.
 */
export function validateCsrfToken() {
  return defineEventHandler(async (event) => {
    const method = event.method.toUpperCase()
    if (SAFE_METHODS.has(method)) return

    const session = await getSession()
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
