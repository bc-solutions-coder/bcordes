import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { User } from '@/lib/auth/types'
import { getAuthUser } from '@/lib/auth/middleware'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/middleware', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
}))

const routeModule = await import('./me')
const handler = (
  routeModule.Route as unknown as {
    server: {
      handlers: {
        GET: () => Promise<Response>
      }
    }
  }
).server.handlers.GET

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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

    const res = await handler()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(fakeUser)
  })

  it('returns null when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const res = await handler()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })
})
