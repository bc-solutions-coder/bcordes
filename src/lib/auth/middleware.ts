import { redirect } from '@tanstack/react-router'
import { getSession, setSession } from './session'
import { refreshToken, fetchUserProfile } from './oidc'
import type { User } from './types'

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
    // Refresh failed — still return the cached user rather than logging them out
    return session.user
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
