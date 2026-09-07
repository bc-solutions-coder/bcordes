import { expect, it } from 'vitest'
import { createMockAdminUser, createMockUser } from '@bcordes/auth/testing'
import { can, hasPermission, hasRole } from './index'

it('recognizes default user fixture permissions without granting inquiry access', () => {
  const user = createMockUser()
  expect(hasRole(user, 'user')).toBe(true)
  expect(hasPermission(user, 'read:profile')).toBe(true)
  expect(can(user, 'InquiriesRead', {})).toBe(false)
})

it('uses overridden fixture roles and permissions for authorization', () => {
  const user = createMockUser({
    roles: ['reviewer'],
    permissions: ['InquiriesRead'],
  })
  expect(hasRole(user, 'reviewer')).toBe(true)
  expect(hasRole(user, 'user')).toBe(false)
  expect(can(user, 'InquiriesRead', {})).toBe(true)
  expect(can(user, 'InquiriesWrite', {})).toBe(false)
})

it('grants admin fixture capabilities and respects explicit restrictions', () => {
  const admin = createMockAdminUser()
  expect(hasRole(admin, 'admin')).toBe(true)
  for (const permission of ['InquiriesRead', 'InquiriesWrite'])
    expect(can(admin, permission, {})).toBe(true)
  const restricted = createMockAdminUser({
    roles: ['reviewer'],
    permissions: [],
  })
  expect(hasRole(restricted, 'admin')).toBe(false)
  expect(can(restricted, 'InquiriesRead', {})).toBe(false)
})
