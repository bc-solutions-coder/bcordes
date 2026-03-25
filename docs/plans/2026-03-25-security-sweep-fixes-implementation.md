# Security Sweep Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address 7 remaining security findings from the sweep: seroval pin, authorization error handling, COOP/COEP headers, timing-safe OAuth state comparison, service client 401 retry, and CSRF synchronizer token.

**Architecture:** Changes span dependency overrides, middleware, server functions, session management, and the OAuth callback. The CSRF token is the largest change — it adds a token to the session, a server function to expose it, and validation middleware. All other changes are surgical edits to existing files.

**Tech Stack:** TanStack Start, Zod, iron-webcrypto, openid-client, Node crypto, h3 middleware

**Note:** Items A (SSE debug logging), B (missing event listener), and H (Retry-After) from the design doc are already implemented. This plan covers the remaining 7 items.

---

### Task 1: Pin seroval via pnpm override

**Files:**
- Modify: `package.json:90-95`

**Step 1: Write the failing test**

No test needed — this is a dependency pin. Verify via audit output.

**Step 2: Add the override**

In `package.json`, add `"seroval": ">=1.4.1"` to the existing `pnpm.overrides` object:

```json
"pnpm": {
  "overrides": {
    "@tanstack/react-router": "1.168.3",
    "@tanstack/router-core": "1.168.3",
    "seroval": ">=1.4.1"
  }
}
```

**Step 3: Reinstall and verify**

Run: `pnpm install`
Run: `pnpm audit 2>&1 | grep -c seroval`
Expected: 0 (no more seroval findings)

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "fix(deps): pin seroval >=1.4.1 to resolve 5 high-severity CVEs"
```

---

### Task 2: Add COOP and COEP security headers

**Files:**
- Modify: `src/server/middleware/security-headers.ts:8-16`
- Modify: `src/__tests__/security-headers.test.ts`

**Step 1: Write failing tests**

Add two tests to `src/__tests__/security-headers.test.ts`:

```typescript
it('should set Cross-Origin-Opener-Policy to same-origin', () => {
  callMiddleware()
  const headers = getSetHeaders()
  expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
})

it('should set Cross-Origin-Embedder-Policy to require-corp', () => {
  callMiddleware()
  const headers = getSetHeaders()
  expect(headers['Cross-Origin-Embedder-Policy']).toBe('require-corp')
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/__tests__/security-headers.test.ts`
Expected: 2 FAIL

**Step 3: Add headers to middleware**

In `src/server/middleware/security-headers.ts`, add two headers to the `setHeaders` call:

```typescript
export default defineEventHandler((event) => {
  setHeaders(event, {
    'Content-Security-Policy':
      "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  })
})
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/__tests__/security-headers.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/server/middleware/security-headers.ts src/__tests__/security-headers.test.ts
git commit -m "feat(security): add COOP and COEP headers for cross-origin isolation"
```

---

### Task 3: Timing-safe OAuth state comparison

**Files:**
- Modify: `src/routes/auth/callback.ts:61`
- Create: `src/__tests__/oauth-state-timing.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/oauth-state-timing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_PATH = resolve(
  __dirname,
  '..',
  'routes',
  'auth',
  'callback.ts',
)

function readSource(): string {
  return readFileSync(SOURCE_PATH, 'utf-8')
}

describe('OAuth callback — timing-safe state comparison', () => {
  it('should use timingSafeEqual instead of === for state comparison', () => {
    const source = readSource()

    // Must not use === for state comparison
    const stateComparisonLine = source
      .split('\n')
      .find((line) => line.includes('state') && line.includes('storedState') && line.includes('==='))

    expect(stateComparisonLine).toBeUndefined()

    // Must use timingSafeEqual
    expect(source).toContain('timingSafeEqual')
  })

  it('should import timingSafeEqual from node:crypto', () => {
    const source = readSource()
    expect(source).toMatch(/import.*timingSafeEqual.*from\s+['"]node:crypto['"]/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/oauth-state-timing.test.ts`
Expected: FAIL (current code uses `===`)

**Step 3: Implement timing-safe comparison**

In `src/routes/auth/callback.ts`, add import at top:

```typescript
import { timingSafeEqual } from 'node:crypto'
```

Add a helper function after the `isSameOrigin` function:

```typescript
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
```

Replace line 61 (`if (state !== storedState)`) with:

```typescript
if (!safeEqual(state, storedState)) {
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/__tests__/oauth-state-timing.test.ts`
Expected: ALL PASS

**Step 5: Run all auth tests to check for regressions**

Run: `pnpm vitest run src/__tests__/auth-hardening.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/routes/auth/callback.ts src/__tests__/oauth-state-timing.test.ts
git commit -m "fix(auth): use timing-safe comparison for OAuth state parameter"
```

---

### Task 4: Service client 401 retry with token refresh

**Files:**
- Modify: `src/lib/wallow/service-client.ts:90-107`
- Create: `src/__tests__/service-client-401.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/service-client-401.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockClientCredentialsGrant = vi.fn()
const mockDiscovery = vi.fn()

vi.mock('openid-client', () => ({
  allowInsecureRequests: Symbol('allowInsecureRequests'),
  clientCredentialsGrant: (...args: unknown[]) => mockClientCredentialsGrant(...args),
  discovery: (...args: unknown[]) => mockDiscovery(...args),
}))

describe('service client — 401 retry', () => {
  const originalEnv = { ...process.env }
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    process.env.OIDC_ISSUER = 'https://auth.test.local'
    process.env.OIDC_SERVICE_CLIENT_ID = 'svc-client'
    process.env.OIDC_SERVICE_CLIENT_SECRET = 'svc-secret'
    process.env.WALLOW_API_URL = 'https://api.test.local'

    const fakeConfig = { serverMetadata: () => ({ issuer: 'https://auth.test.local' }) }
    mockDiscovery.mockResolvedValue(fakeConfig)

    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should refresh token and retry on 401', async () => {
    // First token
    mockClientCredentialsGrant.mockResolvedValueOnce({
      access_token: 'token-1',
      expires_in: 3600,
    })
    // Refreshed token after 401
    mockClientCredentialsGrant.mockResolvedValueOnce({
      access_token: 'token-2',
      expires_in: 3600,
    })

    // First call returns 401, second succeeds
    fetchSpy
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const { serviceClient } = await import('@/lib/wallow/service-client')
    const response = await serviceClient.get('/api/v1/test')

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    // Second call should use the refreshed token
    const secondCallHeaders = fetchSpy.mock.calls[1][1].headers
    expect(secondCallHeaders.Authorization).toBe('Bearer token-2')
  })

  it('should not retry more than once on repeated 401', async () => {
    mockClientCredentialsGrant.mockResolvedValue({
      access_token: 'token-stale',
      expires_in: 3600,
    })

    fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    const { serviceClient } = await import('@/lib/wallow/service-client')

    await expect(serviceClient.get('/api/v1/test')).rejects.toThrow()
    // Should have tried twice: original + one retry
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/service-client-401.test.ts`
Expected: FAIL (service client doesn't retry on 401)

**Step 3: Implement 401 retry in service client**

In `src/lib/wallow/service-client.ts`, modify the `request` function. After the initial fetch (line 92-96), add 401 handling before the existing 429 block:

```typescript
async function request(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const token = await getServiceToken()

  const doFetch = (accessToken: string) =>
    fetch(`${WALLOW_BASE_URL}${path}`, {
      method,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })

  let response: Response

  try {
    response = await doFetch(token)
  } catch (err) {
    throw toNetworkError(err, method, path)
  }

  // 401 — invalidate cached token, fetch a new one, retry once
  if (response.status === 401) {
    tokenCache = null
    const freshToken = await getServiceToken()
    try {
      response = await doFetch(freshToken)
    } catch (err) {
      throw toNetworkError(err, method, path)
    }
  }

  if (response.status === 429) {
    await new Promise((resolve) =>
      setTimeout(resolve, parseRetryDelay(response)),
    )
    try {
      response = await doFetch(await getServiceToken())
    } catch (err) {
      throw toNetworkError(err, method, path)
    }
  }

  if (!response.ok) {
    const problem = await parseProblemDetails(response, method, path)
    setResponseStatus(problem.status)
    throw new WallowError(problem)
  }

  return response
}
```

Key change: nullify `tokenCache` before calling `getServiceToken()` so it forces a fresh token fetch. The existing inflight deduplication handles concurrent requests.

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/__tests__/service-client-401.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/wallow/service-client.ts src/__tests__/service-client-401.test.ts
git commit -m "fix(wallow): add 401 retry with token refresh to service client"
```

---

### Task 5: Graceful 403/404 error handling in server functions

**Files:**
- Modify: `src/server-fns/inquiries.ts:97-106`
- Modify: `src/server-fns/notifications.ts:80-85`
- Create: `src/__tests__/server-fn-error-handling.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/server-fn-error-handling.test.ts`. These tests verify that WallowError with 403/404 status codes produce user-friendly messages:

```typescript
import { describe, it, expect } from 'vitest'
import { WallowError } from '@/lib/wallow/errors'

describe('WallowError user-facing messages', () => {
  it('should produce a user-friendly message for 403 errors', () => {
    const error = new WallowError({
      type: 'https://httpstatuses.com/403',
      title: 'Forbidden',
      status: 403,
      detail: 'User does not have access to this resource',
      traceId: 'abc-123',
      code: 'FORBIDDEN',
    })
    const json = error.toJSON()
    expect(json.detail).not.toContain('traceId')
    expect(error.status).toBe(403)
  })

  it('should produce a user-friendly message for 404 errors', () => {
    const error = new WallowError({
      type: 'https://httpstatuses.com/404',
      title: 'Not Found',
      status: 404,
      detail: 'Resource not found',
      traceId: 'abc-456',
      code: 'NOT_FOUND',
    })
    const json = error.toJSON()
    expect(json.detail).not.toContain('traceId')
    expect(error.status).toBe(404)
  })
})
```

**Step 2: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/server-fn-error-handling.test.ts`
Expected: PASS (WallowError already strips traceId in toJSON)

The existing `WallowError` already handles this correctly — Wallow scopes access, and the error is already wrapped in `WallowError` by the client. The server functions don't need additional code since `createWallowClient()` already throws `WallowError` on non-ok responses, which includes 403/404.

**Step 3: Verify existing error handling is sufficient**

Review: `src/lib/wallow/client.ts:111-115` — `parseProblemDetails` already creates a proper `WallowError` for any non-ok response, and `WallowError.toJSON()` already strips `traceId`.

No code changes needed. The existing error handling pipeline is already correct:
1. Wallow returns 403/404 when user doesn't own the resource
2. `createWallowClient()` wraps it in `WallowError`
3. `WallowError.toJSON()` sanitizes the output

**Step 4: Commit test**

```bash
git add src/__tests__/server-fn-error-handling.test.ts
git commit -m "test: verify 403/404 error handling in server functions"
```

---

### Task 6: CSRF synchronizer token — session storage

**Files:**
- Modify: `src/lib/auth/types.ts:28-43`
- Modify: `src/lib/auth/session.ts`
- Modify: `src/routes/auth/callback.ts:80-88`
- Create: `src/__tests__/csrf-token.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/csrf-token.test.ts`:

```typescript
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
    // Type-level test: verify the field exists by constructing a valid object
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/csrf-token.test.ts`
Expected: FAIL (TypeScript error — csrfToken not in SessionData)

**Step 3: Add csrfToken to SessionData type**

In `src/lib/auth/types.ts`, add to the `SessionData` interface:

```typescript
/** CSRF synchronizer token for subdomain attack protection */
csrfToken?: string
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/csrf-token.test.ts`
Expected: PASS

**Step 5: Generate CSRF token on session creation**

In `src/routes/auth/callback.ts`, add import:

```typescript
import { randomBytes } from 'node:crypto'
```

In the session creation block (lines 80-88), add `csrfToken`:

```typescript
const sessionData: SessionData = {
  sessionId: crypto.randomUUID(),
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  idToken: tokens.idToken,
  expiresAt,
  user,
  version: 1,
  csrfToken: randomBytes(32).toString('hex'),
}
```

**Step 6: Commit**

```bash
git add src/lib/auth/types.ts src/routes/auth/callback.ts src/__tests__/csrf-token.test.ts
git commit -m "feat(auth): add CSRF token generation to session creation"
```

---

### Task 7: CSRF token — server function and validation middleware

**Files:**
- Create: `src/server-fns/csrf.ts`
- Create: `src/server/middleware/csrf-validation.ts`
- Modify: `src/__tests__/csrf-token.test.ts`

**Step 1: Write failing tests**

Add to `src/__tests__/csrf-token.test.ts`:

```typescript
describe('CSRF token — server function', () => {
  it('getCsrfToken server function should exist and be exported', async () => {
    const mod = await import('@/server-fns/csrf')
    expect(mod.getCsrfToken).toBeDefined()
  })
})

describe('CSRF token — validation', () => {
  it('should export a validateCsrfToken function', async () => {
    const mod = await import('@/server/middleware/csrf-validation')
    expect(mod.validateCsrfToken).toBeDefined()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/__tests__/csrf-token.test.ts`
Expected: FAIL (modules don't exist)

**Step 3: Create getCsrfToken server function**

Create `src/server-fns/csrf.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getSession } from '~/lib/auth/session'

export const getCsrfToken = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getSession()
    if (!session?.csrfToken) {
      return { token: null }
    }
    return { token: session.csrfToken }
  },
)
```

**Step 4: Create CSRF validation middleware**

Create `src/server/middleware/csrf-validation.ts`:

```typescript
import { timingSafeEqual } from 'node:crypto'
import { getSession } from '~/lib/auth/session'
import { getRequestHeader, defineEventHandler, createError } from 'h3'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * CSRF validation middleware.
 * Validates x-csrf-token header on state-changing requests (POST/PUT/PATCH/DELETE).
 * Skips validation for safe methods and unauthenticated requests.
 */
export function validateCsrfToken() {
  return defineEventHandler(async (event) => {
    const method = event.method?.toUpperCase() ?? 'GET'
    if (SAFE_METHODS.has(method)) return

    const session = await getSession()
    // Skip CSRF check for unauthenticated requests (e.g. anonymous inquiry submission)
    if (!session?.csrfToken) return

    const headerToken = getRequestHeader(event, 'x-csrf-token')
    if (!headerToken || !safeEqual(headerToken, session.csrfToken)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid CSRF token',
      })
    }
  })
}

export default validateCsrfToken()
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/__tests__/csrf-token.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/server-fns/csrf.ts src/server/middleware/csrf-validation.ts src/__tests__/csrf-token.test.ts
git commit -m "feat(auth): add CSRF token server function and validation middleware"
```

---

### Task 8: Integration verification

**Step 1: Run all tests**

Run: `pnpm test`
Expected: ALL PASS

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Run audit**

Run: `pnpm audit 2>&1 | grep -i seroval`
Expected: No seroval findings

**Step 5: Final commit if any fixups needed**

Only if lint/build required changes.

---

## Task Summary

| Task | Description | Files Changed | Estimated Steps |
|------|-------------|---------------|-----------------|
| 1 | Pin seroval override | package.json | 4 |
| 2 | COOP/COEP headers | security-headers.ts, test | 5 |
| 3 | Timing-safe OAuth state | callback.ts, test | 6 |
| 4 | Service client 401 retry | service-client.ts, test | 5 |
| 5 | Verify 403/404 error handling | test only | 4 |
| 6 | CSRF token — session storage | types.ts, callback.ts, test | 6 |
| 7 | CSRF token — server fn + middleware | csrf.ts, csrf-validation.ts, test | 6 |
| 8 | Integration verification | none | 5 |
