import type { SessionData, User } from '@/lib/auth/types'

// ---------------------------------------------------------------------------
// User factories
// ---------------------------------------------------------------------------

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
    permissions: ['read:profile'],
    tenantId: 'tenant-001',
    tenantName: 'Test Tenant',
    ...overrides,
  }
}

export function createMockAdminUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    id: 'test-admin-456',
    name: 'Admin User',
    email: 'admin@example.com',
    roles: ['user', 'admin'],
    permissions: ['read:profile', 'manage:users', 'manage:settings'],
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Session factories
// ---------------------------------------------------------------------------

export function createMockSession(
  overrides: Partial<SessionData> = {},
): SessionData {
  return {
    sessionId: 'session-test-001',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    idToken: 'mock-id-token',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    user: createMockUser(overrides.user),
    version: 1,
    ...overrides,
  }
}

export function createMockAdminSession(
  overrides: Partial<SessionData> = {},
): SessionData {
  return createMockSession({
    sessionId: 'session-admin-001',
    user: createMockAdminUser(overrides.user),
    ...overrides,
  })
}
