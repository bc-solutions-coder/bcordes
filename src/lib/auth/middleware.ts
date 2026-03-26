import { redirect } from '@tanstack/react-router'
import { clearSession, getSession, setSession } from './session'
import { fetchUserProfile, refreshToken } from './oidc'
import type { SessionData, User } from './types'

/** Resolve the current authenticated user, silently refreshing tokens if needed. */
export async function getAuthUser(): Promise<User | null> {
  const session = await getSession()
  if (!session) return null

  const now = Math.floor(Date.now() / 1000)

  // Token not yet expired (or expiry unknown) — return cached user
  if (!session.expiresAt || now < session.expiresAt - 30) return session.user

  // No refresh token available — return cached user as-is
  if (!session.refreshToken) return session.user

  try {
    const tokens = await refreshToken(session.refreshToken)
    const subject = tokens.subject || session.user.id
    const user = await fetchUserProfile(tokens.accessToken, subject)
    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expiresIn
    await setSession({
      ...session,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      user,
      version: session.version + 1,
    })
    return user
  } catch {
    // Refresh failed — clear the session to avoid returning stale credentials
    clearSession()
    return null
  }
}

/** Require an authenticated user or redirect to the login page. */
export async function requireAuth(returnTo?: string): Promise<User> {
  const user = await getAuthUser()
  if (!user) {
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
    const error = new Error('Authentication required')
    ;(error as unknown as Record<string, unknown>).status = 403
    throw error
  }
  if (!session.user.roles.includes('admin')) {
    const error = new Error('Forbidden: admin role required')
    ;(error as unknown as Record<string, unknown>).status = 403
    throw error
  }
  return session.user
}
