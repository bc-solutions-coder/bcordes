import type { User } from '@bcordes/auth/types'

/** Map of role name to the actions that role grants. */
export type Policy = Record<string, Array<string>>

/** True when the user exists and holds the given role. */
export function hasRole(user: User | null, role: string): boolean {
  return user != null && user.roles.includes(role)
}

/** True when the user exists and holds at least one of the candidate roles. */
export function hasAnyRole(user: User | null, roles: Array<string>): boolean {
  return (
    user != null &&
    roles.length > 0 &&
    roles.some((role) => user.roles.includes(role))
  )
}

/** True when the user exists and holds the given permission. */
export function hasPermission(user: User | null, permission: string): boolean {
  return user != null && user.permissions.includes(permission)
}

/** True when one of the user's roles grants the action under the policy, or the user holds the action as a direct permission. */
export function can(
  user: User | null,
  action: string,
  policy: Policy,
): boolean {
  if (user == null) return false
  return (
    user.roles.some(
      (role) => role in policy && policy[role].includes(action),
    ) || hasPermission(user, action)
  )
}
