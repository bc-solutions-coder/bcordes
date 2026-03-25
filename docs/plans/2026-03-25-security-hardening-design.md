# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all findings from the security audit — security headers, authorization, input validation, error sanitization, SSE hardening, Docker, and cleanup.

**Architecture:** Defense-in-depth approach. Add Nitro server middleware for security headers. Add BFF-layer authorization guards on admin server functions. Tighten Zod schemas. Sanitize error responses before they reach the client. Harden SSE/SignalR stream with session revalidation and proper reconnection. Run Docker container as non-root.

**Tech Stack:** TanStack Start, Nitro, Zod, iron-webcrypto, SignalR, Docker

---

## Epic 1: Security Headers (Nitro Middleware)

### Task 1: Add security headers middleware

**Files:**

- Create: `src/server/middleware/security-headers.ts`

**Context:** Nitro supports server middleware via files in `server/middleware/`. TanStack Start with Nitro will auto-discover these. No security headers (CSP, HSTS, X-Frame-Options, etc.) are currently configured anywhere.

**Step 1: Create the Nitro middleware file**

```typescript
import { defineEventHandler, setHeaders } from 'h3'

export default defineEventHandler((event) => {
  setHeaders(event, {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
})
```

**Step 2: Verify the middleware loads**

Run: `pnpm dev` and check response headers with `curl -I http://localhost:3000`

Expected: All security headers present in the response.

**Step 3: Commit**

```bash
git add src/server/middleware/security-headers.ts
git commit -m "feat(security): add Nitro middleware for CSP, HSTS, and security headers"
```

**Note:** If Nitro/TanStack Start doesn't auto-discover `server/middleware/`, the middleware may need to be registered in `app.config.ts` or a Nitro config. Check TanStack Start docs for the correct middleware registration pattern. An alternative is adding a Nitro plugin.

---

## Epic 2: Authorization & Input Validation

### Task 2: Add admin authorization guard to inquiry server functions

**Files:**

- Modify: `src/server-fns/inquiries.ts`

**Context:** `fetchInquiries` (line 57) and `updateInquiryStatus` (line 84) have no role checks — any authenticated user can call the admin endpoint. The `getSession()` call already returns the user with roles. Add a guard that checks `session.user.roles.includes('admin')`.

**Step 1: Add admin guard helper and apply to `fetchInquiries`**

In `src/server-fns/inquiries.ts`, add a helper and modify `fetchInquiries`:

```typescript
import { setResponseStatus } from '@tanstack/react-start/server'

async function requireAdmin() {
  const client = await createWallowClient()
  const session = await getSession()
  if (!session?.user.roles.includes('admin')) {
    setResponseStatus(403)
    throw new Error('Forbidden: admin role required')
  }
  return client
}
```

Update `fetchInquiries` handler (line 58-62):

```typescript
;async () => {
  const client = await requireAdmin()
  const response = await client.get('/api/v1/inquiries')
  return ((await response.json()) as Array<Inquiry>).map(normalizeInquiryStatus)
}
```

Update `updateInquiryStatus` handler (line 86-93):

```typescript
;async ({ data }) => {
  const client = await requireAdmin()
  const apiStatus = statusToApi[data.status] ?? data.status
  const response = await client.patch(`/api/v1/inquiries/${data.id}/status`, {
    newStatus: apiStatus,
  })
  return normalizeInquiryStatus((await response.json()) as Inquiry)
}
```

**Step 2: Commit**

```bash
git add src/server-fns/inquiries.ts
git commit -m "feat(security): add admin authorization guard to inquiry admin endpoints"
```

### Task 3: Tighten Zod schemas across server functions

**Files:**

- Modify: `src/server-fns/inquiries.ts`
- Modify: `src/server-fns/notifications.ts`

**Context:** Several Zod schemas use `z.string()` without constraints where enums or max lengths are appropriate.

**Step 1: Fix inquiries schemas**

In `src/server-fns/inquiries.ts`:

- Line 85: Change `status: z.string()` to:

  ```typescript
  status: z.enum(['new', 'reviewed', 'contacted', 'closed'])
  ```

- Line 77: Change `id: z.string()` to:

  ```typescript
  id: z.string().uuid()
  ```

  (Apply to all `id` fields on lines 77, 85, 96, 104)

- Line 105: Change `content: z.string().min(1)` to:
  ```typescript
  content: z.string().min(1).max(10000)
  ```

**Step 2: Fix notifications schemas**

In `src/server-fns/notifications.ts`:

- Line 55: Change `channelType: z.string()` to:

  ```typescript
  channelType: z.enum(['email', 'sms', 'push', 'in_app'])
  ```

- Lines 67-69: Add max lengths to push device registration:

  ```typescript
  endpoint: z.string().url().max(2048),
  p256dh: z.string().max(512),
  auth: z.string().max(512),
  ```

- Line 33 and 81: Add UUID validation to notification/device `id` fields:
  ```typescript
  id: z.string().uuid()
  ```

**Step 3: Commit**

```bash
git add src/server-fns/inquiries.ts src/server-fns/notifications.ts
git commit -m "feat(security): tighten Zod schemas with enums, UUID validation, and max lengths"
```

---

## Epic 3: Notification URL Validation

### Task 4: Validate `actionUrl` in notification routing

**Files:**

- Modify: `src/lib/notifications/routing.ts`
- Modify: `public/sw.js`

**Context:** `actionUrl` from the backend is used directly for navigation (line 6 of routing.ts). Service worker constructs URLs from push data without validating `entityId` format (sw.js lines 15-26). Both could be exploited if the backend is compromised.

**Step 1: Add URL validation to routing.ts**

Replace line 6 in `src/lib/notifications/routing.ts`:

```typescript
export function getNotificationRoute(notification: Notification): string {
  if (notification.actionUrl) {
    // Only allow relative paths — reject absolute URLs, javascript:, data:, etc.
    if (notification.actionUrl.startsWith('/') && !notification.actionUrl.startsWith('//')) {
      return notification.actionUrl
    }
    // Fall through to type-based routing if actionUrl is suspicious
  }
```

**Step 2: Add entityId validation to sw.js**

In `public/sw.js`, validate `entityId` before interpolation:

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { type, entityId } = event.notification.data || {}

  // Validate entityId is a UUID to prevent path injection
  const isValidId = entityId && /^[0-9a-f-]{36}$/i.test(entityId)

  const routeMap = {
    TaskAssigned: isValidId
      ? `/dashboard/tasks/${entityId}`
      : '/dashboard/notifications',
    TaskCompleted: isValidId
      ? `/dashboard/tasks/${entityId}`
      : '/dashboard/notifications',
    TaskComment: isValidId
      ? `/dashboard/tasks/${entityId}`
      : '/dashboard/notifications',
    InquirySubmitted: isValidId
      ? `/dashboard/inquiries/${entityId}`
      : '/dashboard/notifications',
    InquiryStatusChanged: isValidId
      ? `/dashboard/inquiries/${entityId}`
      : '/dashboard/notifications',
    BillingInvoice: '/dashboard/billing',
  }

  const url = routeMap[type] || '/dashboard/notifications'
  event.waitUntil(clients.openWindow(url))
})
```

**Step 3: Commit**

```bash
git add src/lib/notifications/routing.ts public/sw.js
git commit -m "feat(security): validate notification actionUrl and entityId before navigation"
```

### Task 5: Sanitize link hrefs in MarkdownContent

**Files:**

- Modify: `src/components/shared/MarkdownContent.tsx`

**Context:** The `processInlineMarkdown` function on line 11-14 converts `[text](url)` to `<a href="$2">` without protocol validation. A `javascript:alert(1)` URL would produce a clickable XSS link. Currently only used with trusted content, but worth hardening.

**Step 1: Add protocol sanitization to the link regex**

Replace lines 11-14:

```typescript
.replace(
  /\[(.+?)\]\((.+?)\)/g,
  (_match, text, url) => {
    const safeUrl = /^(https?:\/\/|\/(?!\/)|#|mailto:)/i.test(url) ? url : '#'
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`
  },
)
```

**Step 2: Commit**

```bash
git add src/components/shared/MarkdownContent.tsx
git commit -m "feat(security): sanitize link protocols in MarkdownContent to prevent javascript: XSS"
```

---

## Epic 4: Error Response Sanitization

### Task 6: Strip internal details from WallowError before client serialization

**Files:**

- Modify: `src/lib/wallow/errors.ts`

**Context:** `WallowError` includes `traceId` and potentially sensitive `detail` messages from the backend. TanStack Start serializes thrown errors and sends them to the client. The `traceId` leaks internal distributed tracing identifiers.

**Step 1: Add a `toJSON` method to WallowError that strips internals**

In `src/lib/wallow/errors.ts`, add after the constructor (line 24):

```typescript
/** Strip internal details when serialized for the client */
toJSON() {
  return {
    name: this.name,
    message: this.isValidation ? 'Validation failed' : this.message,
    status: this.status,
    code: this.code,
    validationErrors: this.validationErrors,
    // traceId intentionally omitted from client response
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/wallow/errors.ts
git commit -m "feat(security): strip traceId and internal details from client-facing WallowError"
```

---

## Epic 5: SSE/SignalR Stream Hardening

### Task 7: Fix orphaned hub on reconnection and gate debug logging

**Files:**

- Modify: `src/routes/api/notifications/stream.ts`

**Context:** Three issues in this file:

1. `LogLevel.Debug` hardcoded on line 21 — may leak sensitive data in production
2. Hub `on()` monkey-patch logs all payloads (lines 54-59)
3. Reconnection creates new hub without updating the reference for `cancel()` (lines 74-95)

**Step 1: Fix log level**

Replace line 21:

```typescript
.configureLogging(process.env.NODE_ENV === 'production' ? LogLevel.Warning : LogLevel.Debug)
```

**Step 2: Gate debug logging behind dev check**

Replace lines 53-60:

```typescript
if (process.env.NODE_ENV !== 'production') {
  const origOn = hub.on.bind(hub)
  hub.on = (methodName: string, handler: (...args: unknown[]) => void) => {
    return origOn(methodName, (...args: unknown[]) => {
      console.log(
        `[sse] hub.on("${methodName}"):`,
        JSON.stringify(args).slice(0, 300),
      )
      handler(...args)
    })
  }
}
```

**Step 3: Fix orphaned hub on reconnection**

Change `const hub` to `let hub` on line 34 and update the reconnection logic (lines 74-95):

```typescript
hub.onclose(async () => {
  if (closed) return
  const currentSession = session as SessionData
  if (!currentSession.refreshToken) return

  try {
    const tokens = await refreshToken(currentSession.refreshToken)
    const newHub = buildHubConnection(tokens.accessToken)
    newHub.on('ReceiveNotifications', (envelope: RealtimeEnvelope) =>
      send(envelope),
    )
    newHub.on('ReceiveNotification', (envelope: RealtimeEnvelope) =>
      send(envelope),
    )
    newHub.on('ReceivePresence', (envelope: RealtimeEnvelope) => send(envelope))

    // Set up recursive onclose for the new hub
    newHub.onclose(async () => {
      if (!closed) controller.close()
    })

    await newHub.start()
    hub = newHub // Update reference so cancel() stops the right hub
    console.log('[sse] reconnected to hub')
  } catch {
    if (!closed) controller.close()
  }
})
```

Also remove the user ID log on line 99:

```typescript
// Before:
console.log('[sse] hub connected for user:', session.user.id)
// After:
console.log('[sse] hub connected')
```

**Step 4: Commit**

```bash
git add src/routes/api/notifications/stream.ts
git commit -m "feat(security): harden SSE stream — fix orphaned hub, gate debug logging, remove user ID from logs"
```

---

## Epic 6: Auth Hardening

### Task 8: Handle refresh failure by clearing stale session

**Files:**

- Modify: `src/lib/auth/middleware.ts`

**Context:** When token refresh fails (line 33-35), the middleware silently returns the cached user. This means a user with a revoked refresh token continues to appear authenticated. A user whose access has been revoked should be logged out.

**Step 1: Clear session on refresh failure instead of returning stale user**

Replace lines 33-36 in `src/lib/auth/middleware.ts`:

```typescript
} catch {
  // Refresh failed — session may be revoked, clear it
  return null
}
```

**Rationale:** Returning `null` causes `requireAuth` (line 42) to redirect to login. This is safer than silently returning stale credentials. If the OIDC provider is temporarily down, users will need to re-login, which is acceptable for a personal site.

**Step 2: Commit**

```bash
git add src/lib/auth/middleware.ts
git commit -m "feat(security): clear session on token refresh failure instead of returning stale user"
```

### Task 9: Remove GET handler from logout

**Files:**

- Modify: `src/routes/auth/logout.ts`

**Context:** GET logout on line 25 allows CSRF via `<img src="/auth/logout">`. Only POST should perform state-changing operations.

**Step 1: Remove GET handler**

Replace lines 22-29:

```typescript
export const Route = createFileRoute('/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => handleLogout(request),
    },
  },
})
```

**Step 2: Verify logout still works from the UI**

Check that the logout button/link in the app uses a POST form or fetch, not a GET link. If it uses a GET link, update it to use a form with `method="POST"`.

**Step 3: Commit**

```bash
git add src/routes/auth/logout.ts
git commit -m "feat(security): remove GET logout handler to prevent CSRF logout attacks"
```

### Task 10: Add session cookie `Max-Age` and env var validation

**Files:**

- Modify: `src/lib/auth/session.ts`
- Modify: `src/lib/auth/oidc.ts`

**Context:**

1. Session cookie has no `Max-Age` (line 51-56), making it a browser-session cookie inconsistent with the 24h server TTL.
2. `OIDC_CLIENT_ID!`, `OIDC_REDIRECT_URI!` etc. use non-null assertions without startup validation.

**Step 1: Add `Max-Age` to session cookies**

In `src/lib/auth/session.ts`, add `maxAge` to the `setCookie` call (line 51-56):

```typescript
setCookie(COOKIE_NAME, sealed, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_TTL_MS / 1000, // 24 hours in seconds
})
```

Also add it to the `sealSessionCookie` function (line 67-73):

```typescript
const parts = [
  `${COOKIE_NAME}=${sealed}`,
  'HttpOnly',
  'Path=/',
  'SameSite=Lax',
  `Max-Age=${SESSION_TTL_MS / 1000}`,
  ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
]
```

**Step 2: Add env var validation to oidc.ts**

At the top of `src/lib/auth/oidc.ts`, after the imports (line 14), add:

```typescript
const requiredEnvVars = [
  'OIDC_ISSUER',
  'OIDC_CLIENT_ID',
  'OIDC_REDIRECT_URI',
] as const
for (const name of requiredEnvVars) {
  if (!process.env[name]) {
    throw new Error(`${name} environment variable is not set`)
  }
}
```

Remove the inline check for `OIDC_ISSUER` on line 35-36 (now covered by the loop).

**Step 3: Commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/oidc.ts
git commit -m "feat(security): add session cookie Max-Age and validate required OIDC env vars at startup"
```

---

## Epic 7: Docker & Dependencies Cleanup

### Task 11: Run Docker container as non-root user

**Files:**

- Modify: `Dockerfile`

**Context:** The runtime stage (line 36) does not include a `USER` directive, so the Node process runs as root.

**Step 1: Add non-root user to runtime stage**

After line 37 (`WORKDIR /app`), add:

```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
```

After line 41 (`COPY --from=builder /app/.output ./.output`), add:

```dockerfile
RUN chown -R appuser:appgroup .output
USER appuser
```

**Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat(security): run Docker container as non-root user"
```

### Task 12: Move dev dependencies to devDependencies

**Files:**

- Modify: `package.json`

**Context:** `@faker-js/faker`, `storybook`, and `@storybook/react-vite` are in production dependencies but are only needed for development.

**Step 1: Move packages**

```bash
pnpm remove @faker-js/faker storybook @storybook/react-vite
pnpm add -D @faker-js/faker storybook @storybook/react-vite
```

**Step 2: Verify build still works**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: move dev-only dependencies to devDependencies"
```

---

## Epic 8: Reduce Error Logging Verbosity

### Task 13: Sanitize error logging across the codebase

**Files:**

- Modify: `src/lib/wallow/client.ts`
- Modify: `src/routes/auth/callback.ts`

**Context:** Full error objects are logged via `console.error` in multiple places, which could include sensitive data in log aggregation.

**Step 1: Log only error message in client.ts**

Replace lines 85-88 in `src/lib/wallow/client.ts`:

```typescript
console.error(`[wallow] ${method} ${path} → ${response.status}`, {
  title: problem.title,
  code: problem.code,
  status: problem.status,
})
```

**Step 2: Log only error message in callback.ts**

Find the `console.error('[auth/callback] Token exchange failed:', err)` line in `src/routes/auth/callback.ts` and replace:

```typescript
console.error(
  '[auth/callback] Token exchange failed:',
  err instanceof Error ? err.message : 'Unknown error',
)
```

**Step 3: Commit**

```bash
git add src/lib/wallow/client.ts src/routes/auth/callback.ts
git commit -m "feat(security): sanitize error logging to prevent leaking sensitive data"
```

---

## Summary

| Epic                           | Tasks       | Priority | Risk Addressed                                  |
| ------------------------------ | ----------- | -------- | ----------------------------------------------- |
| 1. Security Headers            | Task 1      | High     | Clickjacking, XSS, MIME sniffing                |
| 2. Authorization & Validation  | Tasks 2-3   | High     | Unauthorized admin access, input injection      |
| 3. Notification URL Validation | Tasks 4-5   | Medium   | Open redirect, XSS via notifications/markdown   |
| 4. Error Sanitization          | Task 6      | Medium   | Internal detail leakage to client               |
| 5. SSE Hardening               | Task 7      | Medium   | Resource leaks, data exposure in logs           |
| 6. Auth Hardening              | Tasks 8-10  | Medium   | Stale sessions, CSRF logout, cookie lifetime    |
| 7. Docker & Deps               | Tasks 11-12 | Medium   | Container privilege escalation, bloated bundles |
| 8. Error Logging               | Task 13     | Low      | Sensitive data in logs                          |

**Total: 13 tasks across 8 epics**
