import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SessionData, User } from '@/lib/auth/types'

describe('CSRF token — session storage', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env.SESSION_SECRET = 'a]zV-*M8WG#aNrqd,1>dC&.7[Px4bxgf'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('SessionData type should include optional csrfToken field', async () => {
    const session: SessionData = {
      sessionId: 'test-sess',
      accessToken: 'at',
      refreshToken: 'rt',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'u1',
        name: 'Test',
        email: 'test@test.com',
        roles: ['user'],
        permissions: [],
        tenantId: 't1',
        tenantName: 'T1',
      },
      version: 1,
      csrfToken: 'abc123',
    }
    expect(session.csrfToken).toBe('abc123')
  })
})
