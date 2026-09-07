import { redirect } from '@tanstack/react-router'
import { isApiFailure } from '@bc-solutions-coder/api-errors'
import { usersGetCurrentUser } from '@bc-solutions-coder/sdk'
import { getSession } from './session'
import { createRequestSdk } from './sdk'
import type { User } from './types'

export async function getAuthUser(): Promise<User | null> {
  const session = await getSession()
  if (!session) return null
  try {
    const sdk = await createRequestSdk()
    const profile = await usersGetCurrentUser({ client: sdk.client })
    if (!profile.id || profile.id !== session.user.sub) return null
    return {
      id: profile.id,
      name:
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
        session.user.name ||
        profile.email ||
        'User',
      email: profile.email ?? '',
      roles: profile.roles ?? [],
      permissions: profile.permissions ?? [],
      tenantId: session.user.organizationId ?? '',
      tenantName: session.user.organizationName ?? '',
    }
  } catch (error) {
    if (isApiFailure(error) && error.status === 401) return null
    throw error
  }
}

export async function requireAuth(returnTo?: string): Promise<User> {
  const user = await getAuthUser()
  if (!user) {
    const search = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
    throw redirect({ href: `/bff/login${search}` })
  }
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth()
  if (!user.permissions.includes('InquiriesRead')) {
    throw new Response('Forbidden', { status: 403 })
  }
  return user
}
