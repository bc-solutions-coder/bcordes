import { afterEach, expect, it, vi } from 'vitest'
import {
  createMockAdminSession,
  createMockAdminUser,
  createMockSession,
  createMockUser,
} from './index'

afterEach(() => vi.useRealTimers())

it('creates matching session and user identities with a future session expiration', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  const user = createMockUser()
  const session = createMockSession()
  expect(session.user.sub).toBe(user.id)
  expect(session.user.email).toBe(user.email)
  expect(session.expiresAt).toBeGreaterThan(Date.now())
})

it('applies user and session overrides used by authenticated scenarios', () => {
  const user = createMockUser({
    id: 'custom-user',
    email: 'custom@example.com',
    roles: ['reviewer'],
    permissions: ['InquiriesRead'],
  })
  const session = createMockSession({
    sessionId: 'custom-session',
    accessToken: 'custom-token',
    expiresAt: Date.now() + 10_000,
    user: { sub: user.id, email: user.email },
  })
  expect(session.user.sub).toBe('custom-user')
  expect(session.user.email).toBe('custom@example.com')
  expect(session.sessionId).toBe('custom-session')
  expect(session.accessToken).toBe('custom-token')
})

it('gives admin sessions their intended inquiry capabilities', () => {
  const user = createMockAdminUser()
  const session = createMockAdminSession()
  expect(session.user.sub).toBe(user.id)
  for (const permission of ['InquiriesRead', 'InquiriesWrite']) {
    expect(session.user.permissions).toContain(permission)
  }
  expect(session.user.roles).toContain('admin')
})

it('allows admin fixture capabilities and identities to be overridden', () => {
  const user = createMockAdminUser({
    id: 'restricted-admin',
    roles: ['reviewer'],
    permissions: [],
  })
  const session = createMockAdminSession({
    sessionId: 'restricted-session',
    user: { sub: user.id, roles: ['reviewer'], permissions: [] },
  })
  expect(session.user.sub).toBe('restricted-admin')
  expect(session.sessionId).toBe('restricted-session')
  expect(session.user.roles).toEqual(['reviewer'])
  expect(session.user.permissions).toEqual([])
})
