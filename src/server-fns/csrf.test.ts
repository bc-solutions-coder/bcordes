import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionData } from '@/lib/auth/types'

import { getSession } from '~/lib/auth/session'

// Mock @tanstack/react-start so createServerFn chains resolve to the handler
vi.mock('@tanstack/react-start', () => {
  const createServerFn = () => {
    let handlerFn: (...args: Array<unknown>) => unknown
    const chain = {
      inputValidator: () => chain,
      handler: (fn: (...args: Array<unknown>) => unknown) => {
        handlerFn = fn
        const callable = (...args: Array<unknown>) => handlerFn(...args)
        callable.handler = handlerFn
        callable.inputValidator = () => chain
        return callable
      },
    }
    return chain
  }
  return { createServerFn }
})

// Mock session
vi.mock('~/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

const mockedGetSession = vi.mocked(getSession)

const { getCsrfToken } = await import('@/server-fns/csrf')

describe('getCsrfToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns token from session', async () => {
    mockedGetSession.mockResolvedValue({
      sessionId: 'sess-1',
      accessToken: 'at',
      refreshToken: 'rt',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'u-1',
        name: 'Alice',
        email: 'alice@example.com',
        roles: ['user'],
        permissions: [],
        tenantId: 't-1',
        tenantName: 'Tenant',
      },
      version: 1,
      csrfToken: 'csrf-abc-123',
    } as SessionData)

    const result = await getCsrfToken()
    expect(result).toEqual({ token: 'csrf-abc-123' })
  })

  it('returns null when no session exists', async () => {
    mockedGetSession.mockResolvedValue(null)

    const result = await getCsrfToken()
    expect(result).toEqual({ token: null })
  })

  it('returns null when session has no csrfToken', async () => {
    mockedGetSession.mockResolvedValue({
      sessionId: 'sess-1',
      accessToken: 'at',
      refreshToken: 'rt',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'u-1',
        name: 'Alice',
        email: 'alice@example.com',
        roles: ['user'],
        permissions: [],
        tenantId: 't-1',
        tenantName: 'Tenant',
      },
      version: 1,
    } as SessionData)

    const result = await getCsrfToken()
    expect(result).toEqual({ token: null })
  })
})
