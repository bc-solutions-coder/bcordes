import { defaults, seal, unseal } from 'iron-webcrypto'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import type { SessionData } from './types'

const SESSION_SECRET = process.env.SESSION_SECRET!
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set and at least 32 characters')
}

const COOKIE_NAME = '__session'

// ---------------------------------------------------------------------------
// Server-side session store with TTL cleanup
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // run cleanup every hour

const store = new Map<string, SessionData>()
const createdAt = new Map<string, number>()

setInterval(() => {
  const now = Date.now()
  for (const [id, ts] of createdAt) {
    if (now - ts > SESSION_TTL_MS) {
      store.delete(id)
      createdAt.delete(id)
    }
  }
}, CLEANUP_INTERVAL_MS).unref()

export async function getSession(): Promise<SessionData | null> {
  try {
    const value = getCookie(COOKIE_NAME)
    if (!value) return null
    const sessionId = (await unseal(value, SESSION_SECRET, defaults)) as string
    return store.get(sessionId) ?? null
  } catch {
    return null
  }
}

export async function setSession(data: SessionData): Promise<void> {
  store.set(data.sessionId, data)
  if (!createdAt.has(data.sessionId)) createdAt.set(data.sessionId, Date.now())
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
  store.set(data.sessionId, data)
  if (!createdAt.has(data.sessionId)) createdAt.set(data.sessionId, Date.now())
  const sealed = await seal(data.sessionId, SESSION_SECRET, defaults)
  const parts = [
    `${COOKIE_NAME}=${sealed}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
  ]
  return parts.join('; ')
}

export function clearSession(): void {
  try {
    const value = getCookie(COOKIE_NAME)
    if (value) {
      // Best-effort removal from store — fire and forget
      unseal(value, SESSION_SECRET, defaults)
        .then((sessionId) => {
          store.delete(sessionId as string)
          createdAt.delete(sessionId as string)
        })
        .catch(() => {})
    }
  } catch {
    // ignore
  }
  deleteCookie(COOKIE_NAME, { path: '/' })
}

const refreshLocks = new Map<string, Promise<unknown>>()

export function withRefreshLock<T>(
  sessionId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = refreshLocks.get(sessionId)
  if (existing) return existing as Promise<T>

  const promise = fn().finally(() => {
    refreshLocks.delete(sessionId)
  })
  refreshLocks.set(sessionId, promise)
  return promise
}
