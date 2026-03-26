import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@/lib/auth/types'

import { getAuthUser, requireAuth } from '@/lib/auth/middleware'

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

// Mock auth middleware
vi.mock('@/lib/auth/middleware', () => ({
  getAuthUser: vi.fn(),
  requireAuth: vi.fn(),
}))

const mockedGetAuthUser = vi.mocked(getAuthUser)
const mockedRequireAuth = vi.mocked(requireAuth)

// Import after mocks are set up
const { fetchCurrentUserRoles, serverRequireAuth } =
  await import('@/server-fns/auth')

describe('fetchCurrentUserRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns roles when user is authenticated', async () => {
    const user: User = {
      id: 'u-1',
      name: 'Alice',
      email: 'alice@example.com',
      roles: ['admin', 'user'],
      permissions: [],
      tenantId: 't-1',
      tenantName: 'Tenant',
    }
    mockedGetAuthUser.mockResolvedValue(user)

    const result = await fetchCurrentUserRoles()
    expect(result).toEqual({ roles: ['admin', 'user'] })
    expect(mockedGetAuthUser).toHaveBeenCalledOnce()
  })

  it('returns empty roles when no user is authenticated', async () => {
    mockedGetAuthUser.mockResolvedValue(null)

    const result = await fetchCurrentUserRoles()
    expect(result).toEqual({ roles: [] })
  })
})

describe('serverRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates to requireAuth with returnTo', async () => {
    const user: User = {
      id: 'u-1',
      name: 'Alice',
      email: 'alice@example.com',
      roles: ['user'],
      permissions: [],
      tenantId: 't-1',
      tenantName: 'Tenant',
    }
    mockedRequireAuth.mockResolvedValue(user)

    await serverRequireAuth({ data: { returnTo: '/dashboard' } })
    expect(mockedRequireAuth).toHaveBeenCalledWith('/dashboard')
  })

  it('delegates to requireAuth without returnTo', async () => {
    mockedRequireAuth.mockResolvedValue({
      id: 'u-1',
      name: 'Alice',
      email: 'alice@example.com',
      roles: ['user'],
      permissions: [],
      tenantId: 't-1',
      tenantName: 'Tenant',
    })

    await serverRequireAuth({ data: {} })
    expect(mockedRequireAuth).toHaveBeenCalledWith(undefined)
  })
})
