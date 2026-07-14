import { describe, expect, it } from 'vitest'

import { redact, redactUser } from './redact'
import type { User } from '@/lib/auth/types'

describe('redact', () => {
  it('returns "[empty]" for undefined', () => {
    expect(redact(undefined)).toBe('[empty]')
  })

  it('returns "[empty]" for null', () => {
    expect(redact(null)).toBe('[empty]')
  })

  it('returns "[empty]" for empty string', () => {
    expect(redact('')).toBe('[empty]')
  })

  it('returns "[redacted]" for a 3-char string', () => {
    expect(redact('abc')).toBe('[redacted]')
  })

  it('returns "[redacted]" for a 4-char string', () => {
    expect(redact('1234')).toBe('[redacted]')
  })

  it('returns "[redacted:...bcde]" for a 5-char string', () => {
    expect(redact('abcde')).toBe('[redacted:...bcde]')
  })

  it('returns a string starting with "[redacted:..." and ending with last 4 chars for a long token', () => {
    const token = 'eyJhbGciOiJSUzI1'
    const result = redact(token)
    expect(result).toMatch(/^\[redacted:\.\.\./)
    expect(result).toMatch(/UzI1\]$/)
  })
})

describe('redactUser', () => {
  const user: User = {
    id: 'user-123',
    name: 'Bryan Cordes',
    email: 'bryan@example.com',
    roles: ['admin', 'user'],
    permissions: ['read', 'write'],
    tenantId: 'tenant-1',
    tenantName: 'Acme Corp',
  }

  it('includes id, name, roles, and tenantId from the input', () => {
    const result = redactUser(user)
    expect(result.id).toBe('user-123')
    expect(result.name).toBe('Bryan Cordes')
    expect(result.roles).toEqual(['admin', 'user'])
    expect(result.tenantId).toBe('tenant-1')
  })

  it('contains exactly the allowed keys', () => {
    const result = redactUser(user)
    expect(Object.keys(result).sort()).toEqual(
      ['id', 'name', 'roles', 'tenantId'].sort(),
    )
  })

  it('does not include email, permissions, or tenantName', () => {
    const result = redactUser(user) as Record<string, unknown>
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('permissions')
    expect(result).not.toHaveProperty('tenantName')
  })
})
