import { defaults, seal, unseal } from 'iron-webcrypto'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import logger from '@bcordes/logger'
import { getValkey, keys } from '@bcordes/valkey'
import { redact } from './redact'
import type { SessionData } from './types'

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
      log.warn(
        {
          sessionId: redact(sessionId),
        },
        'session cookie valid but no data in valkey',
      )
      return null
    }
    log.debug({ sessionId: redact(sessionId) }, 'session loaded')
    return JSON.parse(raw) as SessionData
  } catch (err) {
    log.warn(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      'failed to load session',
    )
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
  log.debug(
    {
      sessionId: redact(data.sessionId),
      version: data.version,
    },
    'session updated in valkey',
  )
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
  log.info(
    {
      sessionId: redact(data.sessionId),
      userId: data.user.id,
    },
    'new session stored in valkey',
  )
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
          log.info(
            {
              sessionId: redact(sessionId as string),
            },
            'clearing session from valkey',
          )
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
    log.debug(
      {
        sessionId: redact(sessionId),
      },
      'refresh lock already held, skipping',
    )
    return undefined
  }

  log.debug({ sessionId: redact(sessionId) }, 'refresh lock acquired')

  try {
    return await fn()
  } finally {
    await getValkey().del(lockKey)
  }
}
