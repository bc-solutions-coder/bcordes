import { defaults, seal, unseal } from 'iron-webcrypto'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import { redact } from './redact'
import type { SessionData } from './types'
import logger from '@/lib/logger'
import { getValkey, keys } from '@/lib/valkey'

const log = logger.child({ module: 'auth.session' })

const SESSION_SECRET = process.env.SESSION_SECRET!
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set and at least 32 characters')
}

const COOKIE_NAME = '__session'
const SESSION_TTL_SECONDS = 86400

export async function getSession(): Promise<SessionData | null> {
  try {
    const value = getCookie(COOKIE_NAME)
    if (!value) {
      log.debug('no session cookie present')
      return null
    }
    const sessionId = (await unseal(value, SESSION_SECRET, defaults)) as string
    const raw = await getValkey().get(keys.session(sessionId))
    if (!raw) {
      log.warn('session cookie valid but no data in valkey', {
        sessionId: redact(sessionId),
      })
      return null
    }
    log.debug('session loaded', { sessionId: redact(sessionId) })
    return JSON.parse(raw) as SessionData
  } catch (err) {
    log.warn('failed to load session', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export async function setSession(data: SessionData): Promise<void> {
  await getValkey().set(
    keys.session(data.sessionId),
    JSON.stringify(data),
    'EX',
    SESSION_TTL_SECONDS,
  )
  log.debug('session updated in valkey', {
    sessionId: redact(data.sessionId),
    version: data.version,
  })
  const sealed = await seal(data.sessionId, SESSION_SECRET, defaults)
  setCookie(COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Seal a session ID and return a Set-Cookie header value.
 * Stores the full session data server-side; the cookie only holds the sealed ID.
 */
export async function sealSessionCookie(data: SessionData): Promise<string> {
  await getValkey().set(
    keys.session(data.sessionId),
    JSON.stringify(data),
    'EX',
    SESSION_TTL_SECONDS,
  )
  log.info('new session stored in valkey', {
    sessionId: redact(data.sessionId),
    userId: data.user.id,
  })
  const sealed = await seal(data.sessionId, SESSION_SECRET, defaults)
  const parts = [
    `${COOKIE_NAME}=${sealed}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=86400',
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
  ]
  return parts.join('; ')
}

export function clearSession(): void {
  try {
    const value = getCookie(COOKIE_NAME)
    if (value) {
      // Best-effort removal from Valkey — fire and forget
      unseal(value, SESSION_SECRET, defaults)
        .then((sessionId) => {
          log.info('clearing session from valkey', {
            sessionId: redact(sessionId as string),
          })
          getValkey().del(keys.session(sessionId as string))
        })
        .catch(() => {})
    }
  } catch {
    // ignore
  }
  deleteCookie(COOKIE_NAME, { path: '/' })
  log.debug('session cookie cleared')
}

const LOCK_TTL_SECONDS = 10

export async function withRefreshLock<T>(
  sessionId: string,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const lockKey = keys.sessionLock(sessionId)
  const acquired = await getValkey().set(
    lockKey,
    '1',
    'EX',
    LOCK_TTL_SECONDS,
    'NX',
  )
  if (acquired !== 'OK') {
    log.debug('refresh lock already held, skipping', {
      sessionId: redact(sessionId),
    })
    return undefined
  }

  log.debug('refresh lock acquired', { sessionId: redact(sessionId) })

  try {
    return await fn()
  } finally {
    await getValkey().del(lockKey)
  }
}
