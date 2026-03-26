import { describe, expect, it } from 'vitest'
import { parseUserFromToken } from './oidc'

/** Build a minimal JWT (header.payload.signature) from a claims object. */
function fakeJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  )
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${header}.${payload}.sig`
}

describe('parseUserFromToken', () => {
  it('maps standard claims to User fields', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'user-123',
        name: 'Bryan Cordes',
        email: 'bryan@example.com',
        role: 'admin',
        org_id: 'org-1',
        org_name: 'Acme Corp',
      }),
    )

    expect(user).toEqual({
      id: 'user-123',
      name: 'Bryan Cordes',
      email: 'bryan@example.com',
      roles: ['admin'],
      permissions: [],
      tenantId: 'org-1',
      tenantName: 'Acme Corp',
    })
  })

  it('preserves an array role claim as-is', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        name: 'Test',
        email: 'test@test.com',
        role: ['admin', 'manager'],
      }),
    )

    expect(user.roles).toEqual(['admin', 'manager'])
  })

  it('defaults roles to [] when role claim is missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        name: 'Test',
        email: 'test@test.com',
      }),
    )

    expect(user.roles).toEqual([])
  })

  it('falls back to preferred_username when name is missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        preferred_username: 'bcordes',
        email: 'b@example.com',
      }),
    )

    expect(user.name).toBe('bcordes')
  })

  it('falls back to email when name and preferred_username are missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        email: 'fallback@example.com',
      }),
    )

    expect(user.name).toBe('fallback@example.com')
  })

  it('falls back to "User" when name, preferred_username, and email are all missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
      }),
    )

    expect(user.name).toBe('User')
  })

  it('throws on a string that is not a three-part JWT', () => {
    expect(() => parseUserFromToken('not-a-jwt')).toThrow(
      'Token is not a valid JWT',
    )
    expect(() => parseUserFromToken('two.parts')).toThrow(
      'Token is not a valid JWT',
    )
    expect(() => parseUserFromToken('a.b.c.d')).toThrow(
      'Token is not a valid JWT',
    )
  })

  it('defaults tenantId and tenantName to empty string when org claims are missing', () => {
    const user = parseUserFromToken(
      fakeJwt({
        sub: 'u1',
        name: 'Test',
        email: 'test@test.com',
      }),
    )

    expect(user.tenantId).toBe('')
    expect(user.tenantName).toBe('')
  })
})
