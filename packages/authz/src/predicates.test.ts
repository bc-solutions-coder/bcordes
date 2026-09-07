import { describe, expect, it } from 'vitest'
import { can, hasAnyRole, hasPermission, hasRole } from './index'
import type { User } from '@bcordes/auth/types'

const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Test',
  email: 't@example.com',
  roles: [],
  permissions: [],
  tenantId: '',
  tenantName: '',
  ...over,
})

describe('hasRole', () => {
  it('returns true when the user has the role', () => {
    expect(hasRole(user({ roles: ['admin'] }), 'admin')).toBe(true)
  })
  it('returns false when the user lacks the role', () => {
    expect(hasRole(user({ roles: ['viewer'] }), 'admin')).toBe(false)
  })
  it('returns false for a null user', () => {
    expect(hasRole(null, 'admin')).toBe(false)
  })
})

describe('hasAnyRole', () => {
  it('returns true when the user has at least one', () => {
    expect(hasAnyRole(user({ roles: ['viewer'] }), ['admin', 'viewer'])).toBe(
      true,
    )
  })
  it('returns false when the user has none', () => {
    expect(hasAnyRole(user({ roles: ['guest'] }), ['admin', 'viewer'])).toBe(
      false,
    )
  })
  it('returns false for an empty candidate list', () => {
    expect(hasAnyRole(user({ roles: ['admin'] }), [])).toBe(false)
  })
})

describe('hasPermission', () => {
  it('returns true when the permission is present', () => {
    expect(
      hasPermission(user({ permissions: ['inquiry:read'] }), 'inquiry:read'),
    ).toBe(true)
  })
  it('returns false when permissions are empty', () => {
    expect(hasPermission(user({ roles: ['admin'] }), 'inquiry:read')).toBe(
      false,
    )
  })
})

describe('can', () => {
  it('grants when a role grants the action', () => {
    expect(
      can(user({ roles: ['admin'] }), 'inquiry:delete', {
        admin: ['inquiry:delete'],
      }),
    ).toBe(true)
  })
  it('denies when neither roles nor direct permissions grant the action', () => {
    expect(
      can(user({ roles: ['viewer'] }), 'inquiry:delete', {
        admin: ['inquiry:delete'],
      }),
    ).toBe(false)
  })
  it('denies for a null user', () => {
    expect(can(null, 'inquiry:delete', { admin: ['inquiry:delete'] })).toBe(
      false,
    )
  })
})
