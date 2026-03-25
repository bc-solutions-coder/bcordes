import type { User } from './types'

/** Normalize a role claim (string | string[] | undefined) into a string array. */
export function parseRoles(rawRole: unknown): Array<string> {
  if (Array.isArray(rawRole)) return rawRole as Array<string>
  if (typeof rawRole === 'string') return [rawRole]
  return []
}

/** Build a User from a flat claims record (JWT payload or userinfo response). */
export function userFromClaims(claims: Record<string, unknown>): User {
  const roles = parseRoles(claims.role)
  return {
    id: claims.sub as string,
    name: (String(
      claims.name ||
        claims.preferred_username ||
        [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
        claims.email ||
        'User',
    )),
    email: String(claims.email ?? ''),
    roles,
    permissions: [],
    tenantId: String(claims.org_id ?? ''),
    tenantName: String(claims.org_name ?? ''),
  }
}
