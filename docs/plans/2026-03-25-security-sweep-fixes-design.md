# Security Sweep Fixes Design

Date: 2026-03-25
Status: Approved

## Overview

Follow-up fixes from a comprehensive security sweep of the bcordes application. Addresses 10 findings across SSE hardening, dependency vulnerabilities, authorization error handling, security headers, OAuth hardening, retry logic, and CSRF protection.

## Section 1: SSE Stream Hardening

**Files:** `src/routes/api/notifications/stream.ts`

**Problems:**
- `LogLevel.Debug` hardcoded for all environments — leaks user data in production logs
- `hub.on` monkey-patch unconditionally logs all SignalR method invocations with payload previews
- Missing `ReceiveNotification` (singular) event listener on reconnect — only 2 of 3 listeners re-registered
- Console.log statements for connection status in all environments

**Changes:**
1. Set `LogLevel.Warning` when `NODE_ENV === 'production'`, `LogLevel.Debug` otherwise
2. Wrap hub.on console.log in `NODE_ENV !== 'production'` guard
3. Add `ReceiveNotification` to reconnect listener registration alongside `ReceiveNotifications` and `ReceivePresence`
4. Gate connection status console.log statements on environment

## Section 2: Dependency Pin

**Files:** `package.json`

**Problem:** 5 high-severity `seroval` vulnerabilities (DoS, RCE, prototype pollution) via `@tanstack/react-devtools > solid-js > seroval <= 1.4.0`. Dev-only dependency but keeps audit noisy.

**Fix:** Add pnpm override to force `seroval >= 1.4.1`:

```json
"pnpm": {
  "overrides": {
    "seroval": ">=1.4.1"
  }
}
```

## Section 3: Authorization Error Handling

**Files:** `src/server-fns/inquiries.ts`, `src/server-fns/notifications.ts`

**Problem:**
- `submitInquiryComment()` doesn't handle 403/404 from Wallow gracefully
- `deregisterPushDevice()` doesn't handle 403/404 from Wallow gracefully

**Context:** Wallow already enforces ownership scoping on both inquiry comments and push devices. No authorization logic needs to be added in TanStack Start.

**Changes:**
- Handle 403/404 responses from Wallow in both server functions
- Surface appropriate user-facing error messages rather than generic failures

## Section 4: Security Headers

**Files:** `src/server/middleware/security-headers.ts`

**Problem:** Missing `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers.

**Changes:**
- Add `Cross-Origin-Opener-Policy: same-origin` — prevents other windows from getting a reference to yours
- Add `Cross-Origin-Embedder-Policy: require-corp` — ensures all subresources explicitly opt in to being loaded
- No third-party external resources are loaded, so `require-corp` is safe. If something breaks, relax to `credentialless`.

## Section 5: OAuth Hardening

**Files:** `src/routes/auth/callback.ts`

**Problem:** OAuth state comparison uses `===`, vulnerable to timing attacks.

**Fix:** Use `crypto.timingSafeEqual()` (Node built-in) to compare the incoming state parameter against the stored cookie value. Both strings converted to Buffers of equal length before comparison.

## Section 6: Retry Logic

**Files:** `src/lib/wallow/client.ts`, `src/lib/wallow/service-client.ts`

### 429 Retry-After (both clients)

**Problem:** Both clients retry once immediately on 429 with no backoff.

**Changes:**
- Check for `Retry-After` header on 429 responses
- Wait that duration, then retry once
- If no `Retry-After` header, fall back to single immediate retry (current behavior)

### Service Client 401 Retry

**Problem:** Service client lacks 401 retry logic unlike the user client.

**Changes:**
- On 401 response, refresh the client credentials token via existing token cache/deduplication mechanism
- Retry the request once with the new token
- Mirrors the user client's existing 401 handling pattern

## Section 7: CSRF Synchronizer Token

**Files:** New middleware, session changes, new server function

**Problem:** SameSite=Lax cookies don't protect against CSRF from subdomains (e.g., `evil.bcordes.dev`). Subdomains are in use.

**Design:**

1. **Token generation** — On session creation, generate a random token via `crypto.randomBytes(32).toString('hex')`, store it in the session map alongside user data
2. **Token delivery** — Expose a `getCsrfToken()` server function that returns the token for the current session. Client calls this once on app load and stores it in memory
3. **Token validation** — Middleware runs before all state-changing server functions. Reads token from `x-csrf-token` request header, compares (timing-safe) against session's stored token
4. **Scope** — Only validate on POST/PUT/PATCH/DELETE; skip GET/HEAD/OPTIONS

This closes the subdomain vector because even if cookies flow from a compromised subdomain, the attacker cannot read the CSRF token from the page (same-origin policy).

## Summary of Changes by File

| File | Changes |
|------|---------|
| `src/routes/api/notifications/stream.ts` | Environment-gated logging, add missing reconnect listener |
| `package.json` | Add pnpm seroval override |
| `src/server-fns/inquiries.ts` | Handle 403/404 from Wallow on comment submission |
| `src/server-fns/notifications.ts` | Handle 403/404 from Wallow on device deregistration |
| `src/server/middleware/security-headers.ts` | Add COOP and COEP headers |
| `src/routes/auth/callback.ts` | Timing-safe state comparison |
| `src/lib/wallow/client.ts` | Retry-After support on 429 |
| `src/lib/wallow/service-client.ts` | Retry-After support on 429, 401 retry with token refresh |
| `src/lib/auth/session.ts` | Store CSRF token in session on creation |
| New: CSRF middleware | Validate x-csrf-token header on state-changing requests |
| New: CSRF server function | Expose `getCsrfToken()` for client retrieval |
