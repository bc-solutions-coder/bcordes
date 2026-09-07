import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuthUser } from '@bcordes/auth/middleware'
import type { User } from '@bcordes/auth/types'

vi.mock('@bcordes/auth/middleware', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@bcordes/logger', () => {
  const child = () => mockLogger
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child,
  }
  return { default: mockLogger }
})

const { Route } = await import('./me')
const handlers = Route.options.server?.handlers
if (
  !handlers ||
  typeof handlers === 'function' ||
  !handlers.GET ||
  typeof handlers.GET !== 'function'
) {
  throw new Error('GET /auth/me handler is unavailable')
}
const handler = handlers.GET

const fakeUser: User = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  roles: ['admin'],
  permissions: ['read', 'write'],
  tenantId: 'tenant-1',
  tenantName: 'Acme',
}

describe('GET /auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user JSON when authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(fakeUser)

    const res: unknown = await Reflect.apply(handler, undefined, [])

    if (!(res instanceof Response)) throw new Error('Expected an HTTP response')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.status).toBe(200)
    const body: unknown = await res.json()
    expect(body).toEqual(fakeUser)
  })

  it('returns null when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const res: unknown = await Reflect.apply(handler, undefined, [])

    if (!(res instanceof Response)) throw new Error('Expected an HTTP response')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.status).toBe(200)
    const body: unknown = await res.json()
    expect(body).toBeNull()
  })
})
