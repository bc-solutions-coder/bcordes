# Comprehensive Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add complete unit test and E2E test coverage to the bcordes.dev application.

**Architecture:** Two test layers - Vitest unit/integration tests co-located with source files, and Playwright E2E tests in a top-level `e2e/` directory. All external dependencies (Wallow API, OIDC) are mocked. Auth bypass in E2E via sealed session cookie injection.

**Tech Stack:** Vitest 3.2, @testing-library/react 16, jsdom 27, Playwright (latest), iron-webcrypto (for auth fixture)

---

### Task 1: Vitest Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
})
```

**Step 2: Create src/test/setup.ts**

```typescript
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

**Step 3: Run vitest to verify config loads**

Run: `pnpm vitest run --passWithNoTests`
Expected: PASS (no test files yet, but config loads without errors)

**Step 4: Commit**

```bash
git add vitest.config.ts src/test/setup.ts
git commit -m "test: add vitest configuration and test setup"
```

---

### Task 2: Test Mock Factories

**Files:**
- Create: `src/test/mocks/wallow.ts`
- Create: `src/test/mocks/auth.ts`
- Create: `src/test/helpers/render.tsx`

**Step 1: Create wallow mock factory**

Create `src/test/mocks/wallow.ts`:

```typescript
import { vi } from 'vitest'

/** Create a mock WallowClient where each method is a vi.fn() */
export function createMockWallowClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}

/** Helper to make a mock Response with JSON body */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Helper to make a mock Response with text body */
export function textResponse(text: string, status = 200): Response {
  return new Response(text, { status })
}
```

**Step 2: Create auth mock factory**

Create `src/test/mocks/auth.ts`:

```typescript
import type { User, SessionData } from '@/lib/auth/types'

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
    permissions: [],
    tenantId: 'tenant-1',
    tenantName: 'Test Tenant',
    ...overrides,
  }
}

export function createMockSession(
  overrides: Partial<SessionData> = {},
): SessionData {
  return {
    sessionId: 'session-abc',
    accessToken: 'access-token-xyz',
    refreshToken: 'refresh-token-xyz',
    idToken: 'id-token-xyz',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    user: createMockUser(),
    version: 1,
    ...overrides,
  }
}

export function createMockAdminUser(): User {
  return createMockUser({ roles: ['admin'] })
}

export function createMockAdminSession(): SessionData {
  return createMockSession({ user: createMockAdminUser() })
}
```

**Step 3: Create render helper**

Create `src/test/helpers/render.tsx`:

```tsx
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient }
}
```

**Step 4: Verify mocks compile**

Run: `pnpm vitest run --passWithNoTests`
Expected: PASS (config still loads, TypeScript compiles the new files)

**Step 5: Commit**

```bash
git add src/test/
git commit -m "test: add mock factories and render helper"
```

---

### Task 3: WallowError Unit Tests

**Files:**
- Create: `src/lib/wallow/errors.test.ts`
- Reference: `src/lib/wallow/errors.ts`
- Reference: `src/lib/wallow/types.ts`

**Step 1: Write failing tests**

Create `src/lib/wallow/errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { WallowError, isWallowError } from './errors'
import type { ProblemDetails } from './types'

function makeProblem(overrides: Partial<ProblemDetails> = {}): ProblemDetails {
  return {
    type: 'https://httpstatuses.com/500',
    title: 'Internal Server Error',
    status: 500,
    detail: 'Something went wrong',
    traceId: 'trace-123',
    code: 'INTERNAL_ERROR',
    ...overrides,
  }
}

describe('WallowError', () => {
  it('sets message from detail field', () => {
    const err = new WallowError(makeProblem({ detail: 'Not allowed' }))
    expect(err.message).toBe('Not allowed')
  })

  it('falls back to title when detail is empty', () => {
    const err = new WallowError(makeProblem({ detail: '', title: 'Bad Request' }))
    expect(err.message).toBe('Bad Request')
  })

  it('exposes status, code, and traceId', () => {
    const err = new WallowError(
      makeProblem({ status: 422, code: 'VALIDATION', traceId: 'abc' }),
    )
    expect(err.status).toBe(422)
    expect(err.code).toBe('VALIDATION')
    expect(err.traceId).toBe('abc')
  })

  it('sets name to WallowError', () => {
    const err = new WallowError(makeProblem())
    expect(err.name).toBe('WallowError')
  })

  describe('isValidation', () => {
    it('returns true for 400 with field errors', () => {
      const err = new WallowError(
        makeProblem({
          status: 400,
          errors: { email: ['Email is required'] },
        }),
      )
      expect(err.isValidation).toBe(true)
    })

    it('returns false for 400 without field errors', () => {
      const err = new WallowError(makeProblem({ status: 400 }))
      expect(err.isValidation).toBe(false)
    })

    it('returns false for non-400 with errors', () => {
      const err = new WallowError(
        makeProblem({ status: 500, errors: { field: ['err'] } }),
      )
      expect(err.isValidation).toBe(false)
    })
  })

  describe('status helpers', () => {
    it('isNotFound is true for 404', () => {
      expect(new WallowError(makeProblem({ status: 404 })).isNotFound).toBe(true)
    })

    it('isForbidden is true for 403', () => {
      expect(new WallowError(makeProblem({ status: 403 })).isForbidden).toBe(true)
    })

    it('isUnauthorized is true for 401', () => {
      expect(new WallowError(makeProblem({ status: 401 })).isUnauthorized).toBe(
        true,
      )
    })
  })
})

describe('isWallowError', () => {
  it('returns true for WallowError instances', () => {
    expect(isWallowError(new WallowError(makeProblem()))).toBe(true)
  })

  it('returns false for plain Error', () => {
    expect(isWallowError(new Error('nope'))).toBe(false)
  })

  it('returns false for non-errors', () => {
    expect(isWallowError('string')).toBe(false)
    expect(isWallowError(null)).toBe(false)
    expect(isWallowError(undefined)).toBe(false)
  })
})
```

**Step 2: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/wallow/errors.test.ts`
Expected: All tests PASS (these test existing code, no implementation needed)

**Step 3: Commit**

```bash
git add src/lib/wallow/errors.test.ts
git commit -m "test: add WallowError unit tests"
```

---

### Task 4: Notification Routing Unit Tests

**Files:**
- Create: `src/lib/notifications/routing.test.ts`
- Reference: `src/lib/notifications/routing.ts`

**Step 1: Write tests**

Create `src/lib/notifications/routing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getNotificationRoute } from './routing'
import type { Notification } from '@/lib/wallow/types'

function makeNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'SystemAlert',
    title: 'Test',
    message: 'Test message',
    isRead: false,
    readAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getNotificationRoute', () => {
  it('returns actionUrl when present', () => {
    const result = getNotificationRoute(
      makeNotification({ actionUrl: '/custom/path' }),
    )
    expect(result).toBe('/custom/path')
  })

  describe('task notifications', () => {
    it.each(['TaskAssigned', 'TaskCompleted', 'TaskComment'])(
      'routes %s to task detail when entityId is present',
      (type) => {
        const result = getNotificationRoute(
          makeNotification({ type, entityId: 'task-42' }),
        )
        expect(result).toBe('/dashboard/tasks/task-42')
      },
    )

    it('falls back to notifications when entityId is missing', () => {
      const result = getNotificationRoute(
        makeNotification({ type: 'TaskAssigned', entityId: undefined }),
      )
      expect(result).toBe('/dashboard/notifications')
    })
  })

  describe('inquiry notifications', () => {
    it.each(['InquirySubmitted', 'InquiryStatusChanged', 'InquiryComment'])(
      'routes %s to inquiry detail when entityId is present',
      (type) => {
        const result = getNotificationRoute(
          makeNotification({ type, entityId: 'inq-7' }),
        )
        expect(result).toBe('/dashboard/inquiries/inq-7')
      },
    )
  })

  it('routes BillingInvoice to billing page', () => {
    const result = getNotificationRoute(
      makeNotification({ type: 'BillingInvoice' }),
    )
    expect(result).toBe('/dashboard/billing')
  })

  it('falls back to /dashboard/notifications for unknown types', () => {
    const result = getNotificationRoute(
      makeNotification({ type: 'SomethingNew' }),
    )
    expect(result).toBe('/dashboard/notifications')
  })
})
```

**Step 2: Run tests**

Run: `pnpm vitest run src/lib/notifications/routing.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/lib/notifications/routing.test.ts
git commit -m "test: add notification routing unit tests"
```

---

### Task 5: parseUserFromToken Unit Tests

**Files:**
- Create: `src/lib/auth/oidc.test.ts`
- Reference: `src/lib/auth/oidc.ts`

**Step 1: Write tests**

Create `src/lib/auth/oidc.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseUserFromToken } from './oidc'

/** Build a fake JWT with the given payload (header and signature are ignored) */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
    'base64url',
  )
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature`
}

describe('parseUserFromToken', () => {
  it('extracts user fields from JWT claims', () => {
    const token = fakeJwt({
      sub: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'admin',
      org_id: 'org-1',
      org_name: 'Acme',
    })
    const user = parseUserFromToken(token)
    expect(user).toEqual({
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      roles: ['admin'],
      permissions: [],
      tenantId: 'org-1',
      tenantName: 'Acme',
    })
  })

  it('handles array roles', () => {
    const token = fakeJwt({
      sub: 'user-2',
      name: 'Bob',
      email: 'bob@example.com',
      role: ['admin', 'manager'],
    })
    const user = parseUserFromToken(token)
    expect(user.roles).toEqual(['admin', 'manager'])
  })

  it('defaults roles to empty array when missing', () => {
    const token = fakeJwt({ sub: 'user-3', name: 'Charlie' })
    const user = parseUserFromToken(token)
    expect(user.roles).toEqual([])
  })

  it('falls back to preferred_username when name is missing', () => {
    const token = fakeJwt({
      sub: 'user-4',
      preferred_username: 'charlie_c',
    })
    const user = parseUserFromToken(token)
    expect(user.name).toBe('charlie_c')
  })

  it('falls back to given_name + family_name', () => {
    const token = fakeJwt({
      sub: 'user-5',
      given_name: 'Dana',
      family_name: 'Smith',
    })
    const user = parseUserFromToken(token)
    expect(user.name).toBe('Dana Smith')
  })

  it('falls back to email when no name claims exist', () => {
    const token = fakeJwt({
      sub: 'user-6',
      email: 'fallback@example.com',
    })
    const user = parseUserFromToken(token)
    expect(user.name).toBe('fallback@example.com')
  })

  it('falls back to "User" when no identifiable claims exist', () => {
    const token = fakeJwt({ sub: 'user-7' })
    const user = parseUserFromToken(token)
    expect(user.name).toBe('User')
  })

  it('throws for non-JWT tokens (opaque/encrypted)', () => {
    expect(() => parseUserFromToken('opaque-token')).toThrow(
      'Token is not a valid JWT',
    )
  })

  it('defaults tenant fields to empty string when missing', () => {
    const token = fakeJwt({ sub: 'user-8', name: 'Eve' })
    const user = parseUserFromToken(token)
    expect(user.tenantId).toBe('')
    expect(user.tenantName).toBe('')
  })
})
```

**Step 2: Run tests**

Run: `pnpm vitest run src/lib/auth/oidc.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/lib/auth/oidc.test.ts
git commit -m "test: add parseUserFromToken unit tests"
```

---

### Task 6: withRefreshLock Unit Tests

**Files:**
- Create: `src/lib/auth/session.test.ts`
- Reference: `src/lib/auth/session.ts`

Note: Most of session.ts depends on cookie/iron-webcrypto which require server context. `withRefreshLock` is a pure concurrency utility we can test in isolation.

**Step 1: Write tests**

Create `src/lib/auth/session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies that session.ts imports at module level
vi.mock('iron-webcrypto', () => ({
  defaults: {},
  seal: vi.fn(),
  unseal: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}))

// Now import after mocks are in place
const { withRefreshLock } = await import('./session')

describe('withRefreshLock', () => {
  it('executes the callback and returns its result', async () => {
    const result = await withRefreshLock('session-1', async () => 'refreshed')
    expect(result).toBe('refreshed')
  })

  it('deduplicates concurrent calls for the same session', async () => {
    let callCount = 0
    const slowRefresh = () =>
      new Promise<string>((resolve) => {
        callCount++
        setTimeout(() => resolve('done'), 50)
      })

    const [r1, r2, r3] = await Promise.all([
      withRefreshLock('session-2', slowRefresh),
      withRefreshLock('session-2', slowRefresh),
      withRefreshLock('session-2', slowRefresh),
    ])

    expect(callCount).toBe(1)
    expect(r1).toBe('done')
    expect(r2).toBe('done')
    expect(r3).toBe('done')
  })

  it('allows separate sessions to refresh independently', async () => {
    const calls: string[] = []

    await Promise.all([
      withRefreshLock('a', async () => {
        calls.push('a')
        return 'a'
      }),
      withRefreshLock('b', async () => {
        calls.push('b')
        return 'b'
      }),
    ])

    expect(calls).toContain('a')
    expect(calls).toContain('b')
  })

  it('cleans up lock after completion so next call runs fresh', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      return callCount
    }

    const first = await withRefreshLock('session-3', fn)
    const second = await withRefreshLock('session-3', fn)

    expect(first).toBe(1)
    expect(second).toBe(2)
  })

  it('cleans up lock on failure so next call can retry', async () => {
    const failOnce = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success')

    await expect(withRefreshLock('session-4', failOnce)).rejects.toThrow('fail')
    const result = await withRefreshLock('session-4', failOnce)
    expect(result).toBe('success')
  })
})
```

**Step 2: Run tests**

Run: `pnpm vitest run src/lib/auth/session.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/lib/auth/session.test.ts
git commit -m "test: add withRefreshLock concurrency tests"
```

---

### Task 7: useSignalR Hook Tests

**Files:**
- Create: `src/hooks/useSignalR.test.ts`
- Reference: `src/hooks/useSignalR.ts`

**Step 1: Write tests**

Create `src/hooks/useSignalR.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSignalR } from './useSignalR'

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  listeners = new Map<string, EventListener[]>()
  readyState = 0

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type)!.push(listener)
  }

  close() {
    this.readyState = 2
  }

  // Test helpers
  simulateOpen() {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }

  simulateMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }))
  }

  simulateNamedEvent(type: string, data: string) {
    const event = new MessageEvent(type, { data })
    this.listeners.get(type)?.forEach((l) => l(event))
  }

  simulateError() {
    this.onerror?.(new Event('error'))
  }
}

describe('useSignalR', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    vi.useFakeTimers()
    vi.stubGlobal('EventSource', MockEventSource)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('connects on mount and sets status to connected', () => {
    const { result } = renderHook(() => useSignalR())

    expect(MockEventSource.instances).toHaveLength(1)
    expect(MockEventSource.instances[0].url).toBe('/api/notifications/stream')
    expect(result.current.status).toBe('connecting')

    act(() => {
      MockEventSource.instances[0].simulateOpen()
    })

    expect(result.current.status).toBe('connected')
  })

  it('dispatches messages to subscribers', () => {
    const handler = vi.fn()
    const { result } = renderHook(() => useSignalR())

    act(() => {
      MockEventSource.instances[0].simulateOpen()
      result.current.subscribe('NotificationCreated', handler)
    })

    const envelope = {
      type: 'NotificationCreated',
      module: 'notifications',
      payload: { id: '1' },
      timestamp: '2026-01-01T00:00:00Z',
    }

    act(() => {
      MockEventSource.instances[0].simulateMessage(JSON.stringify(envelope))
    })

    expect(handler).toHaveBeenCalledWith(envelope)
  })

  it('unsubscribe removes the handler', () => {
    const handler = vi.fn()
    const { result } = renderHook(() => useSignalR())

    let unsub: () => void
    act(() => {
      MockEventSource.instances[0].simulateOpen()
      unsub = result.current.subscribe('NotificationCreated', handler)
    })

    act(() => {
      unsub()
    })

    act(() => {
      MockEventSource.instances[0].simulateMessage(
        JSON.stringify({
          type: 'NotificationCreated',
          module: 'notifications',
          payload: {},
          timestamp: '',
        }),
      )
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('reconnects with exponential backoff on error', () => {
    renderHook(() => useSignalR())

    expect(MockEventSource.instances).toHaveLength(1)

    act(() => {
      MockEventSource.instances[0].simulateError()
    })

    // First reconnect after 1s (2^0 * 1000)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(MockEventSource.instances).toHaveLength(2)

    act(() => {
      MockEventSource.instances[1].simulateError()
    })

    // Second reconnect after 2s (2^1 * 1000)
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(MockEventSource.instances).toHaveLength(3)
  })

  it('closes EventSource and clears timers on unmount', () => {
    const { unmount } = renderHook(() => useSignalR())
    const es = MockEventSource.instances[0]

    act(() => {
      es.simulateOpen()
    })

    unmount()
    expect(es.readyState).toBe(2) // closed
  })
})
```

**Step 2: Run tests**

Run: `pnpm vitest run src/hooks/useSignalR.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/hooks/useSignalR.test.ts
git commit -m "test: add useSignalR hook tests with mock EventSource"
```

---

### Task 8: Playwright Infrastructure

**Files:**
- Create: `e2e/playwright.config.ts`
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/mocks/api.ts`

**Step 1: Install Playwright**

Run: `pnpm add -D @playwright/test`
Then: `pnpx playwright install chromium`

**Step 2: Create playwright config**

Create `e2e/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
```

**Step 3: Create auth fixture**

The auth fixture injects a sealed session cookie so E2E tests bypass OIDC login.

Create `e2e/fixtures/auth.ts`:

```typescript
import { test as base } from '@playwright/test'
import { defaults, seal } from 'iron-webcrypto'
import crypto from 'node:crypto'

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'test-secret-at-least-32-characters-long!'

export const test = base.extend<{ authenticatedPage: typeof base }>({
  // For tests that need auth, use this fixture to inject the session cookie
})

/**
 * Seal a session ID cookie value the same way the server does.
 * Use this to create a `__session` cookie for authenticated E2E tests.
 */
export async function sealSessionId(sessionId: string): Promise<string> {
  // iron-webcrypto needs a Web Crypto implementation in Node
  const webCrypto = crypto.webcrypto as unknown as Crypto
  return seal(webCrypto, sessionId, SESSION_SECRET, defaults)
}
```

**Step 4: Create API mock helpers**

Create `e2e/mocks/api.ts`:

```typescript
import type { Page } from '@playwright/test'

const WALLOW_URL = process.env.WALLOW_API_URL || 'http://localhost:5000'

/** Intercept all Wallow API calls and return mock responses */
export async function mockWallowApi(page: Page) {
  // Default: return empty arrays for list endpoints
  await page.route(`${WALLOW_URL}/api/v1/inquiries`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: [] })
    }
    return route.fulfill({ json: { id: 'new-inquiry', status: 'New' } })
  })

  await page.route(`${WALLOW_URL}/api/v1/notifications*`, (route) => {
    return route.fulfill({
      json: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0 },
    })
  })

  await page.route(
    `${WALLOW_URL}/api/v1/notifications/unread-count`,
    (route) => {
      return route.fulfill({ json: { count: 0 } })
    },
  )

  await page.route(
    `${WALLOW_URL}/api/v1/notification-settings`,
    (route) => {
      return route.fulfill({ json: [] })
    },
  )
}

/** Override a specific API route with custom data */
export async function mockRoute(
  page: Page,
  path: string,
  data: unknown,
  status = 200,
) {
  await page.route(`${WALLOW_URL}${path}`, (route) => {
    return route.fulfill({ json: data, status })
  })
}
```

**Step 5: Add playwright scripts to package.json**

Add to package.json scripts:
```json
"test:e2e": "playwright test --config e2e/playwright.config.ts",
"test:e2e:ui": "playwright test --config e2e/playwright.config.ts --ui"
```

**Step 6: Commit**

```bash
git add e2e/ package.json pnpm-lock.yaml
git commit -m "test: add Playwright infrastructure with auth fixture and API mocks"
```

---

### Task 9: E2E Public Pages Tests

**Files:**
- Create: `e2e/tests/public-pages.spec.ts`

**Step 1: Write tests**

Create `e2e/tests/public-pages.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Public pages', () => {
  test('home page loads with hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Bryan Cordes|bcordes/i)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('about page loads', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('main')).toBeVisible()
  })

  test('projects page loads', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('main')).toBeVisible()
  })

  test('contact page loads with form', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.locator('form')).toBeVisible()
    await expect(page.getByLabel(/name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/message/i)).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/')

    // Find and click About link in navigation
    await page.getByRole('link', { name: /about/i }).first().click()
    await expect(page).toHaveURL(/\/about/)

    await page.getByRole('link', { name: /projects/i }).first().click()
    await expect(page).toHaveURL(/\/projects/)

    await page.getByRole('link', { name: /contact/i }).first().click()
    await expect(page).toHaveURL(/\/contact/)
  })
})
```

**Step 2: Run tests**

Run: `pnpm test:e2e e2e/tests/public-pages.spec.ts`
Expected: All tests PASS (these hit the actual dev server with no mocks needed for public pages)

**Step 3: Commit**

```bash
git add e2e/tests/public-pages.spec.ts
git commit -m "test: add E2E tests for public pages"
```

---

### Task 10: E2E Contact Form Tests

**Files:**
- Create: `e2e/tests/contact-form.spec.ts`

**Step 1: Write tests**

Create `e2e/tests/contact-form.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { mockWallowApi, mockRoute } from '../mocks/api'

test.describe('Contact form', () => {
  test.beforeEach(async ({ page }) => {
    await mockWallowApi(page)
  })

  test('shows validation errors for empty required fields', async ({
    page,
  }) => {
    await page.goto('/contact')

    // Submit without filling anything
    await page.getByRole('button', { name: /send message/i }).click()

    // Should show validation messages
    await expect(page.getByText(/name is required/i)).toBeVisible()
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/message is required/i)).toBeVisible()
  })

  test('submits successfully with valid data', async ({ page }) => {
    // Mock the inquiry submission endpoint
    await mockRoute(page, '/api/v1/inquiries', {
      id: 'inq-new',
      name: 'Test User',
      email: 'test@example.com',
      message: 'Hello, I need help with a project.',
      status: 'new',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      submitterId: null,
    })

    await page.goto('/contact')

    await page.getByLabel(/name/i).fill('Test User')
    await page.getByLabel(/email/i).fill('test@example.com')

    // Select project type
    await page.getByRole('combobox', { name: /project type/i }).click()
    await page.getByRole('option', { name: /frontend/i }).click()

    // Select budget
    await page.getByRole('combobox', { name: /budget/i }).click()
    await page.getByRole('option', { name: /under \$5k/i }).click()

    // Select timeline
    await page.getByRole('combobox', { name: /timeline/i }).click()
    await page.getByRole('option', { name: /1-3 months/i }).click()

    await page.getByLabel(/message/i).fill('Hello, I need help with a project.')

    await page.getByRole('button', { name: /send message/i }).click()

    // Should show success state
    await expect(page.getByText(/message sent/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /send another/i }),
    ).toBeVisible()
  })

  test('can send another message after success', async ({ page }) => {
    await mockRoute(page, '/api/v1/inquiries', {
      id: 'inq-new',
      status: 'new',
      name: 'Test',
      email: 'test@test.com',
      message: 'Test message for project',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      submitterId: null,
    })

    await page.goto('/contact')

    // Fill and submit
    await page.getByLabel(/name/i).fill('Test')
    await page.getByLabel(/email/i).fill('test@test.com')
    await page.getByRole('combobox', { name: /project type/i }).click()
    await page.getByRole('option', { name: /consulting/i }).click()
    await page.getByRole('combobox', { name: /budget/i }).click()
    await page.getByRole('option', { name: /under \$5k/i }).click()
    await page.getByRole('combobox', { name: /timeline/i }).click()
    await page.getByRole('option', { name: /less than 1 month/i }).click()
    await page.getByLabel(/message/i).fill('Test message for project')
    await page.getByRole('button', { name: /send message/i }).click()

    // Click "Send Another Message"
    await page.getByRole('button', { name: /send another/i }).click()

    // Form should be visible again
    await expect(page.getByLabel(/name/i)).toBeVisible()
  })
})
```

**Step 2: Run tests**

Run: `pnpm test:e2e e2e/tests/contact-form.spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add e2e/tests/contact-form.spec.ts
git commit -m "test: add E2E tests for contact form submission"
```

---

### Task 11: E2E Dashboard Tests (Authenticated)

**Files:**
- Create: `e2e/tests/dashboard.spec.ts`

Note: These tests require the auth bypass fixture. The exact implementation depends on how the dev server handles sessions — you may need to set up a test session on the server side. If the cookie-based approach doesn't work because the server-side store is empty, an alternative is to mock the auth server function responses at the API level.

**Step 1: Write tests with API-level auth mocking**

Create `e2e/tests/dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { mockWallowApi, mockRoute } from '../mocks/api'

test.describe('Dashboard (authenticated)', () => {
  // Note: These tests may need auth bypass setup.
  // If the app redirects to login, we need to either:
  // 1. Mock the /auth/me endpoint to return a user
  // 2. Inject a valid session cookie
  // Start with approach 1 and iterate.

  test.beforeEach(async ({ page }) => {
    await mockWallowApi(page)

    // Mock the inquiries list for the dashboard
    await mockRoute(page, '/api/v1/inquiries', [
      {
        id: 'inq-1',
        name: 'Alice',
        email: 'alice@example.com',
        message: 'Need a website',
        status: 'New',
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
        submitterId: null,
      },
      {
        id: 'inq-2',
        name: 'Bob',
        email: 'bob@example.com',
        message: 'API integration help',
        status: 'Reviewed',
        createdAt: '2026-03-02T00:00:00Z',
        updatedAt: '2026-03-02T00:00:00Z',
        submitterId: null,
      },
    ])
  })

  test.skip('inquiries page shows list of inquiries', async ({ page }) => {
    // Skip until auth bypass is configured
    await page.goto('/dashboard/inquiries')
    await expect(page.getByText('Alice')).toBeVisible()
    await expect(page.getByText('Bob')).toBeVisible()
  })

  test.skip('notifications page loads', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    await expect(page.locator('main')).toBeVisible()
  })
})
```

**Step 2: Run tests (skipped for now)**

Run: `pnpm test:e2e e2e/tests/dashboard.spec.ts`
Expected: Tests are skipped. Auth bypass is a follow-up task once the cookie injection approach is validated.

**Step 3: Commit**

```bash
git add e2e/tests/dashboard.spec.ts
git commit -m "test: add scaffolded E2E dashboard tests (skipped pending auth bypass)"
```

---

### Task 12: Add .gitignore Entries and Final Verification

**Files:**
- Modify: `.gitignore`

**Step 1: Add test artifact directories to .gitignore**

Add these lines to `.gitignore`:

```
# Test artifacts
coverage/
test-results/
playwright-report/
e2e/test-results/
e2e/playwright-report/
```

**Step 2: Run all unit tests**

Run: `pnpm vitest run`
Expected: All unit tests pass

**Step 3: Run all E2E tests**

Run: `pnpm test:e2e`
Expected: Public pages and contact form tests pass; dashboard tests are skipped

**Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: add test artifact directories to gitignore"
```
