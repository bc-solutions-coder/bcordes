import type { User } from './types'

export function redact(value: string | undefined | null): string {
  if (!value) return '[empty]'
  if (value.length < 5) return '[redacted]'
  return `[redacted:...${value.slice(-4)}]`
}

export function redactUser(user: User): {
  id: string
  name: string
  roles: Array<string>
  tenantId: string
} {
  return {
    id: user.id,
    name: user.name,
    roles: user.roles,
    tenantId: user.tenantId,
  }
}
