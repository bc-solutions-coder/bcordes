import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionData } from '@bcordes/auth/types'

describe('CSRF token — session storage', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env.SESSION_SECRET = 'a]zV-*M8WG#aNrqd,1>dC&.7[Px4bxgf'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('SessionData type should include optional csrfToken field', () => {
    const session: SessionData = {
      sessionId: 'test-sess',
      accessToken: 'at',
      refreshToken: 'rt',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: {
        sub: 'u1',
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

describe('CSRF token — server function', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SESSION_SECRET = 'a]zV-*M8WG#aNrqd,1>dC&.7[Px4bxgf'
  })

  it('getCsrfToken server function should exist and be exported', async () => {
    const mod = await import('./csrf')
    expect(mod.getCsrfToken).toBeDefined()
  })
})

describe('CSRF token — validation', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SESSION_SECRET = 'a]zV-*M8WG#aNrqd,1>dC&.7[Px4bxgf'
  })

  it('should export a validateCsrfToken function', async () => {
    const mod = await import('./csrf-validation')
    expect(mod.validateCsrfToken).toBeDefined()
  })
})
