import { redirect } from '@tanstack/react-router'
import { redactUser } from './redact'
import { clearSession, getSession, setSession } from './session'
import { fetchUserProfile, refreshToken } from './oidc'
import type { SessionData, User } from './types'
import logger from '@/lib/logger'

const log = logger.child({ module: 'auth' })

/** Resolve the current authenticated user, silently refreshing tokens if needed. */
export async function getAuthUser(): Promise<User | null> {
  const session = await getSession()
  if (!session) {
    log.debug('no active session')
    return null
  }

  const now = Math.floor(Date.now() / 1000)

  // Token not yet expired (or expiry unknown) — return cached user
  if (!session.expiresAt || now < session.expiresAt - 30) {
    const expiresIn = session.expiresAt ? session.expiresAt - now : undefined
    log.debug('session valid, returning cached user', {
      user: redactUser(session.user),
      expiresIn,
    })
    return session.user
  }

  // No refresh token available — return cached user as-is
  if (!session.refreshToken) {
    log.warn('token expired but no refresh token available', {
      user: redactUser(session.user),
    })
    return session.user
  }

  log.info('token expired, attempting refresh', { userId: session.user.id })

  try {
    const tokens = await refreshToken(session.refreshToken)
    const subject = tokens.subject || session.user.id
    const user = await fetchUserProfile(tokens.accessToken, subject)
    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expiresIn
    const version = session.version + 1
    await setSession({
      ...session,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      user,
      version,
    })
    log.info('token refresh successful, session updated', {
      user: redactUser(user),
      version,
    })
    return user
  } catch (err) {
    // Refresh failed — clear the session to avoid returning stale credentials
    log.error('token refresh failed, clearing session', {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    })
    clearSession()
    return null
  }
}

/** Require an authenticated user or redirect to the login page. */
export async function requireAuth(returnTo?: string): Promise<User> {
  const user = await getAuthUser()
  if (!user) {
    log.info('unauthenticated request, redirecting to login', { returnTo })
    throw redirect({
      to: '/auth/login',
      search: returnTo ? { returnTo } : undefined,
    })
  }
  return user
}

/** Require the current user to have the 'admin' role. Throws 403 if not. */
export async function requireAdmin(): Promise<User> {
  const session = await getSession()
  if (!session) {
    log.warn('admin check failed: no session')
    const error = new Error('Authentication required')
    ;(error as unknown as Record<string, unknown>).status = 403
    throw error
  }
  if (!session.user.roles.includes('admin')) {
    log.warn('admin check failed: missing admin role', {
      userId: session.user.id,
      roles: session.user.roles,
    })
    const error = new Error('Forbidden: admin role required')
    ;(error as unknown as Record<string, unknown>).status = 403
    throw error
  }
  return session.user
}
