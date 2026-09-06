import { redirect } from '@tanstack/react-router'
import logger from '@bcordes/logger'
import { redactUser } from './redact'
import { clearSession, getSession, setSession } from './session'
import { fetchUserProfile, refreshToken } from './oidc'
import type { User } from './types'

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
    log.debug(
      {
        user: redactUser(session.user),
        expiresIn,
      },
      'session valid, returning cached user',
    )
    return session.user
  }

  // No refresh token available — return cached user as-is
  if (!session.refreshToken) {
    log.warn(
      {
        user: redactUser(session.user),
      },
      'token expired but no refresh token available',
    )
    return session.user
  }

  log.info({ userId: session.user.id }, 'token expired, attempting refresh')

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
    log.info(
      {
        user: redactUser(user),
        version,
      },
      'token refresh successful, session updated',
    )
    return user
  } catch (err) {
    // Refresh failed — clear the session to avoid returning stale credentials
    log.error(
      {
        userId: session.user.id,
        error: err instanceof Error ? err.message : String(err),
      },
      'token refresh failed, clearing session',
    )
    clearSession()
    return null
  }
}

/** Require an authenticated user or redirect to the login page. */
export async function requireAuth(returnTo?: string): Promise<User> {
  const user = await getAuthUser()
  if (!user) {
    log.info({ returnTo }, 'unauthenticated request, redirecting to login')
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
    log.warn(
      {
        userId: session.user.id,
        roles: session.user.roles,
      },
      'admin check failed: missing admin role',
    )
    const error = new Error('Forbidden: admin role required')
    ;(error as unknown as Record<string, unknown>).status = 403
    throw error
  }
  return session.user
}
