# Authentication Flow Walkthrough - bcordes.dev BFF

> **Purpose:** Step-by-step walkthrough of the entire authentication flow in bcordes.dev.
> Use this document to trace every line of auth code from browser click to API call.
> Each section is self-contained so you can pause and resume at any section boundary.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Variables & Configuration](#2-environment-variables--configuration)
3. [OIDC Discovery & Client Setup](#3-oidc-discovery--client-setup)
4. [Login Flow: Browser to OIDC Provider](#4-login-flow-browser-to-oidc-provider)
5. [Callback Flow: Code Exchange & Session Creation](#5-callback-flow-code-exchange--session-creation)
6. [Session Management: Sealed Cookies + Valkey](#6-session-management-sealed-cookies--valkey)
7. [How the Frontend Knows You're Logged In](#7-how-the-frontend-knows-youre-logged-in)
8. [Protected Routes & Route Guards](#8-protected-routes--route-guards)
9. [Token Refresh: Automatic & On-Demand](#9-token-refresh-automatic--on-demand)
10. [Wallow API Client: Authenticated Requests](#10-wallow-api-client-authenticated-requests)
11. [Service Client: Machine-to-Machine Auth](#11-service-client-machine-to-machine-auth)
12. [Real-Time: SSE Stream Authentication](#12-real-time-sse-stream-authentication)
13. [Logout Flow](#13-logout-flow)
14. [Production Concerns: Reverse Proxy & URLs](#14-production-concerns-reverse-proxy--urls)
15. [Claims Mapping & User Object](#15-claims-mapping--user-object)
16. [Quick Reference: All Auth Files](#16-quick-reference-all-auth-files)

---

## 1. Architecture Overview

```
                                    OIDC Provider (Wallow)
                                    ┌──────────────────────┐
                                    │  /connect/authorize   │
                                    │  /connect/token       │
                                    │  /connect/userinfo    │
                                    │  /connect/logout      │
                                    │  /.well-known/openid  │
                                    └──────┬───────────────┘
                                           │
                                           │ HTTPS
                                           │
┌──────────┐     ┌─────────────────────────┴───────────────────────┐
│  Browser  │────>│  bcordes.dev BFF (TanStack Start + Nitro)       │
│           │     │                                                 │
│  Cookies: │     │  Auth Routes:                                   │
│  __session│     │    /auth/login     → redirect to OIDC           │
│           │     │    /auth/callback  → exchange code, set session  │
│           │     │    /auth/logout    → clear session, OIDC logout  │
│           │     │    /auth/me        → return current user JSON    │
│           │     │                                                 │
│           │     │  Server Functions:                               │
│           │     │    createWallowClient() → Bearer token requests  │
│           │     │    serviceClient        → M2M client credentials │
│           │     │                                                 │
│           │     │  Session Store:                                  │
│           │     │    Cookie → sealed sessionId                     │
│           │     │    Valkey → full SessionData                     │
│           │     └──────────────────┬──────────────────────────────┘
│           │                        │
│           │                        │ Bearer Token
│           │                        ▼
│           │              ┌─────────────────────┐
│           │              │  Wallow API Backend  │
│           │              │  /api/v1/inquiries   │
│           │              │  /api/v1/notifications│
│           │              │  /events (SSE)       │
│           │              └─────────────────────┘
└──────────┘
```

**Key insight:** The browser never sees access tokens. The BFF holds all tokens server-side in Valkey. The browser only gets a sealed cookie containing an opaque session ID.

---

## 2. Environment Variables & Configuration

**File:** `.env` (not committed) and `.env.example`

| Variable                     | Purpose                                       | Example Value                       | Used By                            |
| ---------------------------- | --------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `OIDC_ISSUER`                | OIDC provider base URL                        | `https://api.wallow.dev`            | `src/lib/auth/oidc.ts:36`          |
| `OIDC_CLIENT_ID`             | OAuth2 client ID for user login               | `bcordes-dev-client`                | `src/lib/auth/oidc.ts:38`          |
| `OIDC_CLIENT_SECRET`         | OAuth2 client secret                          | _(generated)_                       | `src/lib/auth/oidc.ts:46`          |
| `OIDC_REDIRECT_URI`          | Where OIDC sends user after login             | `https://bcordes.dev/auth/callback` | `src/lib/auth/oidc.ts:40`          |
| `OIDC_SERVICE_CLIENT_ID`     | M2M service account client ID                 | `sa-bcordes-bff`                    | `src/lib/wallow/service-client.ts` |
| `OIDC_SERVICE_CLIENT_SECRET` | M2M service account secret                    | _(generated)_                       | `src/lib/wallow/service-client.ts` |
| `SESSION_SECRET`             | Sealing key for iron-webcrypto (min 32 chars) | _(random 64+ char string)_          | `src/lib/auth/session.ts:10`       |
| `WALLOW_API_URL`             | Backend API base URL                          | `https://api.wallow.dev`            | `src/lib/wallow/config.ts:1`       |
| `VALKEY_URL`                 | Redis/Valkey connection                       | `redis://default:pass@valkey:6379`  | `src/lib/valkey/`                  |

### Production URL Gotcha

> **CRITICAL:** `OIDC_REDIRECT_URI` must be the **public-facing URL** that the browser will actually navigate to after OIDC login. If you're behind a reverse proxy (e.g., `https://bcordes.dev/auth/callback`), this must match exactly. The OIDC provider will reject callbacks that don't match the registered redirect URI.
>
> Similarly, `OIDC_ISSUER` must be reachable from the **server** (not the browser). If the server is in a Docker container behind a reverse proxy, this might be an internal URL like `http://wallow-api:5000` or might need to be the public URL depending on how discovery metadata URLs are configured.

---

## 3. OIDC Discovery & Client Setup

**File:** `src/lib/auth/oidc.ts`

### Discovery (Lines 26-56)

When any auth operation is first needed, the OIDC client is configured via OpenID Connect Discovery:

```typescript
// src/lib/auth/oidc.ts:26-56
let configPromise: Promise<Configuration> | null = null

function getConfig(): Promise<Configuration> {
  if (!configPromise) {
    const issuer = process.env.OIDC_ISSUER // line 36
    const clientId = process.env.OIDC_CLIENT_ID // line 38
    const redirectUri = process.env.OIDC_REDIRECT_URI // line 40
    // ... validation throws if any are missing

    configPromise = discovery(
      new URL(issuer), // Fetches {issuer}/.well-known/openid-configuration
      clientId,
      process.env.OIDC_CLIENT_SECRET,
      undefined,
      isDev ? { execute: [allowInsecureRequests] } : undefined, // line 49
    ).catch((err) => {
      configPromise = null // Reset cache on failure so next call retries
      throw err
    })
  }
  return configPromise
}
```

**What happens here:**

1. First call triggers a fetch to `{OIDC_ISSUER}/.well-known/openid-configuration`
2. The response contains all OIDC endpoints (authorize, token, userinfo, logout, etc.)
3. Result is cached in `configPromise` — only one discovery call per server lifetime
4. If discovery fails, cache resets so the next attempt retries
5. In dev mode (`isDev`), allows HTTP (no TLS). In production, HTTPS is enforced.

**Rethink note:** At first glance it looks like `configPromise` could cause stale config if the OIDC server changes endpoints. But in practice, OIDC metadata is stable and the server restarts on deploy, so this is fine. The error-reset pattern (line 52) is actually important — without it, a transient network failure during startup would permanently break auth until the server restarts.

### Scopes Requested

```
openid profile email roles offline_access
inquiries.read inquiries.write
notifications.read notifications.write
```

- `openid` — required for OIDC
- `profile email` — user info claims
- `roles` — custom scope for role-based access
- `offline_access` — enables refresh tokens
- `inquiries.*` / `notifications.*` — API resource scopes

---

## 4. Login Flow: Browser to OIDC Provider

**File:** `src/routes/auth/login.ts`

### Trigger

User clicks "Sign In" in the UI. The `UserMenu` component (`src/components/layout/UserMenu.tsx:32-42`) renders a link:

```typescript
// src/components/layout/UserMenu.tsx:33-41
if (!user) {
  return (
    <Link to="/auth/login" className="...">
      Sign In
    </Link>
  )
}
```

### Login Route Handler (Lines 8-46)

```
Browser GET /auth/login?returnTo=/dashboard/inquiries
         │
         ▼
┌─ /auth/login handler ────────────────────────────────┐
│                                                       │
│  1. Generate random `state` (CSRF protection)         │
│  2. Generate random `codeVerifier` (PKCE)             │
│  3. Calculate code_challenge = SHA256(codeVerifier)    │
│  4. Set 3 temporary cookies (10-min TTL):             │
│     • __oauth_state = state                           │
│     • __oauth_code_verifier = codeVerifier            │
│     • __oauth_return_to = "/dashboard/inquiries"      │
│  5. Build authorization URL                           │
│  6. Return 302 redirect to OIDC authorize endpoint    │
│                                                       │
└───────────────────────────────────────────────────────┘
         │
         ▼
Browser redirected to:
  https://api.wallow.dev/connect/authorize?
    client_id=bcordes-dev-client
    redirect_uri=https://bcordes.dev/auth/callback
    scope=openid+profile+email+roles+offline_access+...
    state=<random>
    code_challenge=<SHA256(codeVerifier)>
    code_challenge_method=S256
    response_type=code
```

### Cookie Details (Lines 19-40)

All three temporary cookies share these attributes:

- `httpOnly: true` — JavaScript can't read them
- `secure: true` in production (HTTPS only)
- `sameSite: 'lax'` — sent on same-site navigations
- `maxAge: 600` — 10-minute expiry (enough time for user to log in at OIDC provider)
- `path: '/'` — accessible from any route

**Why 3 separate cookies?** Because the callback route needs to verify the state, use the PKCE verifier, and know where to redirect — and all of this must survive a full browser redirect to the OIDC provider and back.

### What Happens at the OIDC Provider

The user sees the Wallow login form, enters credentials, and the OIDC provider:

1. Validates credentials
2. Checks that `redirect_uri` matches registered values for `client_id`
3. Redirects back to `redirect_uri` with `?code=<authz_code>&state=<state>`

> **Production issue:** If the `redirect_uri` registered in Wallow doesn't exactly match `OIDC_REDIRECT_URI`, the OIDC provider will reject the callback. This includes protocol (`http` vs `https`), domain, port, and path. No partial matches.

---

## 5. Callback Flow: Code Exchange & Session Creation

**File:** `src/routes/auth/callback.ts`

This is the most complex auth route. The browser arrives here after the OIDC provider redirects back.

### Step 1: Validate State & Extract Parameters (Lines 49-73)

```
Browser GET /auth/callback?code=abc123&state=xyz789
         │
         ▼
┌─ Validation ──────────────────────────────────────────┐
│                                                        │
│  Extract from query params:                            │
│    code = "abc123"                                     │
│    state = "xyz789"                                    │
│                                                        │
│  Extract from cookies:                                 │
│    storedState = getCookie('__oauth_state')             │
│    codeVerifier = getCookie('__oauth_code_verifier')    │
│    returnTo = getCookie('__oauth_return_to')            │
│                                                        │
│  Validate:                                             │
│    • code, state, storedState, codeVerifier all exist   │
│      → missing? redirect to /auth/login?error=missing_params  │
│    • timingSafeEqual(state, storedState)                │
│      → mismatch? redirect to /auth/login?error=state_mismatch │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Why timing-safe comparison?** A regular `===` comparison can leak information about which characters matched through timing differences. `timingSafeEqual` takes constant time regardless of where strings differ, preventing timing attacks against the CSRF state token.

### Step 2: Exchange Authorization Code for Tokens (Lines 75-81)

```typescript
// src/routes/auth/callback.ts:76-81
const tokens = await exchangeCode(
  code, // Authorization code from OIDC provider
  codeVerifier, // PKCE verifier from cookie
  request.url, // Full callback URL for verification
  state, // State for additional verification
)
```

This calls `exchangeCode()` in `src/lib/auth/oidc.ts:81-101`:

```typescript
// src/lib/auth/oidc.ts:81-101
export async function exchangeCode(
  _code: string,
  codeVerifier: string,
  callbackUrl: string,
  expectedState: string,
): Promise<TokenResult>
```

Under the hood, `openid-client` sends:

```
POST {OIDC_ISSUER}/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
code=abc123
redirect_uri=https://bcordes.dev/auth/callback
code_verifier=<original_pkce_verifier>
client_id=bcordes-dev-client
client_secret=<secret>
```

The OIDC provider returns:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "id_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Rethink note:** I initially thought `request.url` was used as the redirect_uri for the token exchange. Looking deeper, `openid-client` uses the `callbackUrl` parameter to validate that the callback URL matches what was originally configured. The actual `redirect_uri` sent to the token endpoint comes from the OIDC config (which read `OIDC_REDIRECT_URI`). This is important: if `request.url` doesn't match `OIDC_REDIRECT_URI` (e.g., because a reverse proxy rewrites the Host header), the exchange could fail. The `openid-client` library compares `callbackUrl` against the configured `redirect_uri`.

> **This is a likely production failure point:** If the reverse proxy doesn't preserve the original Host header, `request.url` in the callback handler might be `http://internal-host:3000/auth/callback` instead of `https://bcordes.dev/auth/callback`, causing a mismatch.

### Step 3: Build User Profile (Lines 82-95)

The callback does something subtle — it merges user info from TWO sources:

```typescript
// src/routes/auth/callback.ts:82-95
// Source 1: Parse JWT access token for claims (especially org claims)
const tokenUser = parseUserFromToken(tokens.accessToken)

// Source 2: Fetch from OIDC userinfo endpoint (more complete profile)
const profileUser = await fetchUserProfile(tokens.accessToken, subject)

// Merge: userinfo fields win, but token org claims are kept
const user: User = {
  ...profileUser, // Base: name, email, roles from userinfo
  tenantId: tokenUser.tenantId || profileUser.tenantId,
  tenantName: tokenUser.tenantName || profileUser.tenantName,
}
```

**Why merge?** The userinfo endpoint has the canonical name/email/roles, but org claims (`org_id`, `org_name`) might only be in the JWT. This is a Wallow-specific pattern — OpenIddict (the OIDC server in Wallow) puts some claims in the token that don't appear in userinfo.

**Rethink note:** I first assumed the userinfo endpoint would have all claims. After reading the merge logic, it's clear that the token parsing is specifically needed for tenant/org claims. This is worth verifying in the Wallow brainstorm — does the userinfo endpoint actually return `org_id` and `org_name`? If it does, the token parse is redundant. If it doesn't, this merge is critical.

### Step 4: Create Session (Lines 96-109)

```typescript
// src/routes/auth/callback.ts:100-109
const sessionData: SessionData = {
  sessionId: crypto.randomUUID(), // New UUID for this session
  accessToken: tokens.accessToken, // For API calls
  refreshToken: tokens.refreshToken, // For token renewal
  idToken: tokens.idToken, // For logout (id_token_hint)
  expiresAt, // Unix timestamp (seconds)
  user, // Cached user profile
  version: 1, // Incremented on each refresh
  csrfToken: randomBytes(32).toString('hex'), // CSRF sync token
}
```

**`version` field:** This is incremented every time the session is refreshed. It's a lightweight way to detect stale session reads in concurrent scenarios.

**`csrfToken` field:** Generated but — looking at the codebase — doesn't appear to be checked anywhere currently. It exists in the session data but no middleware validates it. This might be a future safeguard or a planned feature.

### Step 5: Store Session & Set Cookie (Lines 113-123)

```typescript
// Session stored in Valkey with 24h TTL
// Cookie set with sealed sessionId
const setCookieHeader = await sealSessionCookie(sessionData)
```

The response includes:

1. `Set-Cookie: __session=<iron-sealed-session-id>` (with HttpOnly, Secure, etc.)
2. `Set-Cookie: __oauth_state=; Max-Age=0` (clear temp cookie)
3. `Set-Cookie: __oauth_code_verifier=; Max-Age=0` (clear temp cookie)
4. `Set-Cookie: __oauth_return_to=; Max-Age=0` (clear temp cookie)
5. `Location: /dashboard/inquiries` (or `/` if no returnTo)
6. Status: 302

### Open Redirect Protection (Lines 115-118)

```typescript
// Only redirect to same-origin URLs
if (returnTo && isSameOrigin(returnTo, request.url)) {
  // redirect to returnTo
} else {
  // redirect to /
}
```

`isSameOrigin()` prevents an attacker from crafting a login link like `/auth/login?returnTo=https://evil.com` that would redirect the user (with a fresh session) to a malicious site.

---

## 6. Session Management: Sealed Cookies + Valkey

**File:** `src/lib/auth/session.ts`

### The Two-Layer Session Store

```
Browser Cookie (__session)          Valkey (Redis)
┌─────────────────────────┐         ┌──────────────────────────────────┐
│ iron-sealed(sessionId)  │ ──────> │ bcordes:session:{sessionId}      │
│                         │         │                                  │
│ HttpOnly, Secure, Lax   │         │ {                                │
│ Max-Age: 86400 (24h)    │         │   sessionId: "uuid-...",         │
│ Path: /                  │         │   accessToken: "eyJ...",         │
│                         │         │   refreshToken: "rt_...",         │
│ Contains: ONLY the      │         │   idToken: "eyJ...",             │
│ sealed session ID       │         │   expiresAt: 1711929600,         │
│                         │         │   user: { id, name, ... },       │
│ NO tokens, NO user data │         │   version: 1,                    │
└─────────────────────────┘         │   csrfToken: "abc..."            │
                                    │ }                                │
                                    │                                  │
                                    │ TTL: 86400 seconds (24h)         │
                                    └──────────────────────────────────┘
```

**Why this pattern?**

- The cookie is tiny (just a sealed UUID) — no 4KB cookie size limit concerns
- Tokens never leave the server — XSS can't steal access tokens
- Valkey TTL ensures sessions auto-expire even if the cookie persists
- `iron-webcrypto` sealing means tampering with the cookie value gives you garbage, not a different session

### Getting a Session (Lines 18-29)

```typescript
export async function getSession(): Promise<SessionData | null> {
  try {
    const value = getCookie(COOKIE_NAME) // Read __session cookie
    if (!value) return null // No cookie = not logged in
    const sessionId = await unseal(value, SESSION_SECRET, defaults) // Decrypt
    const raw = await getValkey().get(keys.session(sessionId)) // Valkey lookup
    if (!raw) return null // Session expired in Valkey
    return JSON.parse(raw) as SessionData
  } catch {
    return null // Any error = treat as unauthenticated
  }
}
```

**Silent error handling:** Any failure (bad cookie, Valkey down, JSON parse error) returns `null` rather than throwing. This means auth failures degrade gracefully to "not logged in" rather than crashing the page.

### Setting a Session (Lines 31-45)

```typescript
export async function setSession(data: SessionData): Promise<void> {
  // 1. Store full data in Valkey with 24h TTL
  await getValkey().set(
    keys.session(data.sessionId),
    JSON.stringify(data),
    'EX',
    SESSION_TTL_SECONDS, // 86400
  )
  // 2. Seal session ID and set cookie
  const sealed = await seal(data.sessionId, SESSION_SECRET, defaults)
  setCookie(COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}
```

> **Production note:** `secure: true` only in production. This means the cookie is sent over HTTP in dev but requires HTTPS in production. If your reverse proxy terminates TLS and forwards HTTP internally, the cookie will still be marked `Secure` — the browser sees HTTPS and will send it.

### Clearing a Session (Lines 70-85)

```typescript
export function clearSession(): void {
  try {
    const value = getCookie(COOKIE_NAME)
    if (value) {
      // Fire-and-forget Valkey cleanup
      unseal(value, SESSION_SECRET, defaults)
        .then((sessionId) => {
          getValkey().del(keys.session(sessionId as string))
        })
        .catch(() => {}) // Ignore errors
    }
  } catch {
    /* ignore */
  }
  deleteCookie(COOKIE_NAME, { path: '/' }) // Always delete cookie
}
```

**Fire-and-forget:** Valkey deletion is async and unwaited. The cookie is deleted synchronously. This means logout is instant from the browser's perspective, even if Valkey cleanup takes a moment.

### Distributed Refresh Lock (Lines 89-108)

```typescript
export async function withRefreshLock<T>(
  sessionId: string,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const lockKey = keys.sessionLock(sessionId) // bcordes:lock:session:{id}
  const acquired = await getValkey().set(
    lockKey,
    '1',
    'EX',
    LOCK_TTL_SECONDS, // 10 seconds
    'NX', // Only if key doesn't exist
  )
  if (acquired !== 'OK') return undefined // Someone else is refreshing
  try {
    return await fn()
  } finally {
    await getValkey().del(lockKey) // Release lock
  }
}
```

**What this prevents:** If 5 API requests fire simultaneously and all get 401s, without this lock, all 5 would try to refresh the token at the same time. With the lock, only the first one refreshes. The others get `undefined` and can re-read the updated session.

---

## 7. How the Frontend Knows You're Logged In

### The useUser Hook

**File:** `src/hooks/useUser.ts` (Lines 1-25)

```typescript
async function fetchUser(): Promise<User | null> {
  const res = await fetch('/auth/me')
  if (!res.ok) return null
  return res.json()
}

export function useUser() {
  const { data, isLoading } = useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: false, // Don't retry on failure
  })
  return { user: data ?? null, isLoading }
}
```

**Flow:**

1. Component mounts → TanStack Query fires `GET /auth/me`
2. `/auth/me` route handler (`src/routes/auth/me.ts:4-13`) calls `getAuthUser()`
3. `getAuthUser()` reads session, auto-refreshes token if needed
4. Returns `User` object or `null`
5. TanStack Query caches result for 5 minutes

### The /auth/me Endpoint

**File:** `src/routes/auth/me.ts` (Lines 4-13)

```typescript
export const Route = createFileRoute('/auth/me')({
  server: {
    handlers: {
      GET: async () => {
        const user = await getAuthUser()
        return Response.json(user ?? null, { status: 200 })
      },
    },
  },
})
```

**Always returns 200** — even when not logged in. The frontend distinguishes by checking if the response is `null` or a user object.

### Where useUser is Called

| Component             | File                                            | What It Does                            |
| --------------------- | ----------------------------------------------- | --------------------------------------- |
| `UserMenu`            | `src/components/layout/UserMenu.tsx:28`         | Shows "Sign In" or user avatar dropdown |
| `Header`              | `src/components/layout/Header.tsx:22`           | Hides CTA button for admin users        |
| `MobileNav`           | `src/components/layout/MobileNav.tsx:20`        | Shows Dashboard/SignOut or SignIn       |
| `NotificationBell`    | `src/components/layout/NotificationBell.tsx:29` | Only fetches notifications if logged in |
| `EventStreamProvider` | `src/hooks/EventStreamProvider.tsx:211`         | Only connects SSE if user exists        |

---

## 8. Protected Routes & Route Guards

### The serverRequireAuth Pattern

**File:** `src/server-fns/auth.ts` (Lines 5-9)

```typescript
export const serverRequireAuth = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ returnTo: z.string().optional() }))
  .handler(async ({ data }) => {
    await requireAuth(data.returnTo)
  })
```

This is a TanStack Start server function. It runs on the server during route navigation.

### How Routes Use It

**File:** `src/routes/dashboard/inquiries.index.tsx` (Lines 28-30)

```typescript
export const Route = createFileRoute('/dashboard/inquiries/')({
  beforeLoad: () =>
    serverRequireAuth({ data: { returnTo: '/dashboard/inquiries' } }),
  // ...
})
```

**What `beforeLoad` does:** Runs BEFORE the route loads. If `requireAuth` throws a redirect (because user isn't logged in), the route never loads and the browser redirects to `/auth/login?returnTo=/dashboard/inquiries`.

### The requireAuth Middleware

**File:** `src/lib/auth/middleware.ts` (Lines 41-50)

```typescript
export async function requireAuth(returnTo?: string): Promise<User> {
  const user = await getAuthUser()
  if (!user) {
    throw redirect({
      to: '/auth/login',
      search: returnTo ? { returnTo } : undefined,
    })
  }
  return user
}
```

### The requireAdmin Guard

**File:** `src/lib/auth/middleware.ts` (Lines 53-66)

```typescript
export async function requireAdmin(): Promise<User> {
  const session = await getSession()
  if (!session) {
    const error = new Error('Authentication required')
    ;(error as unknown as Record<string, unknown>).status = 403
    throw error
  }
  if (!session.user.roles.includes('admin')) {
    const error = new Error('Forbidden: admin role required')
    ;(error as unknown as Record<string, unknown>).status = 403
    throw error
  }
  return session.user
}
```

**Rethink note:** `requireAdmin` does NOT auto-refresh tokens (it calls `getSession()` directly, not `getAuthUser()`). This is probably intentional — admin API calls are typically short-lived and if the token is expired, it's better to fail fast with 403 than silently refresh. But it means an admin user whose token expired might get a 403 instead of an auto-refresh. This is worth examining further.

### Protected Routes in the Codebase

| Route                      | File                                          | Guard               |
| -------------------------- | --------------------------------------------- | ------------------- |
| `/dashboard/inquiries`     | `src/routes/dashboard/inquiries.index.tsx:29` | `serverRequireAuth` |
| `/dashboard/inquiries/:id` | `src/routes/dashboard/inquiries.$id.tsx:18`   | `serverRequireAuth` |
| `/dashboard/settings`      | `src/routes/dashboard/settings.index.tsx:29`  | `serverRequireAuth` |

---

## 9. Token Refresh: Automatic & On-Demand

Token refresh happens in TWO places:

### Place 1: getAuthUser() — Proactive Refresh

**File:** `src/lib/auth/middleware.ts` (Lines 6-38)

```typescript
export async function getAuthUser(): Promise<User | null> {
  const session = await getSession()
  if (!session) return null

  const now = Math.floor(Date.now() / 1000)

  // Still valid? Return cached user
  if (!session.expiresAt || now < session.expiresAt - 30) return session.user
  //                                              ^^^^ 30-second buffer

  // No refresh token? Return cached user (can't refresh)
  if (!session.refreshToken) return session.user

  try {
    const tokens = await refreshToken(session.refreshToken)
    const subject = tokens.subject || session.user.id
    const user = await fetchUserProfile(tokens.accessToken, subject)
    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expiresIn
    await setSession({
      ...session,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      user,
      version: session.version + 1, // Increment version
    })
    return user
  } catch {
    clearSession() // Refresh failed → force re-login
    return null
  }
}
```

**Called by:** `/auth/me`, `requireAuth()`, SSR route guards

**The 30-second buffer:** Instead of waiting until the token is actually expired, refresh triggers 30 seconds early. This prevents the race condition where a token expires between the check and the API call.

### Place 2: createWallowClient() — Reactive Refresh (On 401)

**File:** `src/lib/wallow/client.ts` (Lines 55-71, 81-122)

```typescript
// When an API call returns 401:
if (response.status === 401 || isAuthRedirect(response)) {
  currentSession = await refreshSession(currentSession) // Refresh & retry
  response = await doFetch(path, method, currentSession.accessToken, body)
}
```

The `refreshSession` function (Lines 55-71):

```typescript
async function refreshSession(
  currentSession: SessionData,
): Promise<SessionData> {
  return withRefreshLock(currentSession.sessionId, async () => {
    const tokens = await refreshToken(currentSession.refreshToken)
    const updated: SessionData = {
      ...currentSession,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expiresIn,
      user: parseUserFromToken(tokens.idToken),
      version: currentSession.version + 1,
    }
    await setSession(updated)
    return updated
  })
}
```

**Rethink note:** I noticed something subtle: `getAuthUser()` calls `fetchUserProfile()` after refresh (which hits the OIDC userinfo endpoint), but `refreshSession()` in the Wallow client calls `parseUserFromToken()` (which just decodes the JWT). These produce slightly different user objects. The userinfo endpoint is more authoritative, but the JWT parse is faster and doesn't make a network call. This inconsistency could matter if claims differ between the token and userinfo.

### Token Refresh Flow Diagram

```
Request to Wallow API
         │
         ▼
    ┌─ doFetch() with current accessToken ─┐
    │                                       │
    ▼                                       │
Response                                    │
    │                                       │
    ├─ 200 OK → return response             │
    │                                       │
    ├─ 401 or 3xx to /Account/Login         │
    │   │                                   │
    │   ▼                                   │
    │   withRefreshLock(sessionId)           │
    │   │                                   │
    │   ├─ Lock acquired?                   │
    │   │   ├─ YES: refreshToken() → setSession() → retry doFetch()
    │   │   └─ NO: return undefined (another request is refreshing)
    │   │                                   │
    │   └─ Refresh failed? → throw WallowError(401)
    │                                       │
    ├─ 429 → wait Retry-After → retry       │
    │                                       │
    └─ Other error → throw WallowError      │
                                            │
```

### isAuthRedirect — A Wallow-Specific Pattern

**File:** `src/lib/wallow/request.ts` (Lines 8-14)

```typescript
export function isAuthRedirect(response: Response): boolean {
  if (response.status < 300 || response.status >= 400) return false
  const location = response.headers.get('Location') ?? ''
  return location.includes('/Account/Login')
}
```

**Why this exists:** Wallow (the .NET backend) sometimes returns 302 redirects to `/Account/Login` instead of 401 responses. This happens when ASP.NET's default authentication challenge behavior kicks in before the API pipeline handles it. The `redirect: 'manual'` option in fetch (set in `buildFetchOptions`) prevents the browser from following these redirects, allowing the code to detect them and treat them as auth failures.

> **Production concern:** The `/Account/Login` path is hardcoded. If Wallow changes this redirect path, the detection would break silently — API calls would fail without triggering refresh.

---

## 10. Wallow API Client: Authenticated Requests

**File:** `src/lib/wallow/client.ts`

### Client Creation

```typescript
// src/lib/wallow/client.ts:73-80
export async function createWallowClient(): Promise<WallowClient> {
  const session = await getSession()
  if (!session) {
    setResponseStatus(401)
    throw new Error('No active session')
  }
  // Returns client with get/post/put/patch/delete methods
}
```

### Request Construction

**File:** `src/lib/wallow/client.ts` (Lines 24-41, `buildFetchOptions`)

Every request includes:

```
Authorization: Bearer {accessToken}
Accept: application/json
Content-Type: application/json  (when body present)
```

Additional settings:

- `redirect: 'manual'` — prevents following 3xx redirects (for auth redirect detection)
- `signal: AbortSignal.timeout(30_000)` — 30-second timeout per request

### Request URL Construction

**File:** `src/lib/wallow/config.ts` (Line 1)

```typescript
export const WALLOW_BASE_URL = process.env.WALLOW_API_URL!
```

Every request is: `fetch(${WALLOW_BASE_URL}${path}, options)`

For example: `client.get('/api/v1/inquiries')` → `fetch('https://api.wallow.dev/api/v1/inquiries', ...)`

### Error Handling: WallowError & ProblemDetails

**File:** `src/lib/wallow/errors.ts` (Lines 1-64)

```typescript
class WallowError extends Error {
  status: number // HTTP status code
  code: string // Application error code
  traceId: string // Backend trace ID for debugging
  validationErrors?: Record<string, Array<string>>

  get isValidation() {
    return this.status === 400 && !!this.validationErrors
  }
  get isNotFound() {
    return this.status === 404
  }
  get isForbidden() {
    return this.status === 403
  }
  get isUnauthorized() {
    return this.status === 401
  }
}
```

Wallow returns RFC 7807 ProblemDetails:

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Token expired",
  "traceId": "abc-123",
  "code": "TOKEN_EXPIRED"
}
```

### How Server Functions Use the Client

**Example:** `src/server-fns/inquiries.ts` (Lines 33-46)

```typescript
export const submitInquiry = createServerFn({ method: 'POST' })
  .inputValidator(submitInquirySchema)
  .handler(async ({ data }) => {
    const session = await getSession()

    if (session) {
      // Authenticated user → use user client (Bearer token)
      const client = await createWallowClient()
      const response = await client.post('/api/v1/inquiries', data)
      return normalizeInquiryStatus((await response.json()) as Inquiry)
    }

    // Anonymous user → use service client (M2M)
    const response = await serviceClient.post('/api/v1/inquiries', data)
    return normalizeInquiryStatus((await response.json()) as Inquiry)
  })
```

**Pattern:** Check if session exists → use user client. No session → fall back to service client. Not all endpoints have this fallback; some use `requireAdmin()` which throws if unauthenticated.

---

## 11. Service Client: Machine-to-Machine Auth

**File:** `src/lib/wallow/service-client.ts`

### Client Credentials Grant

The service client uses OAuth2 client credentials (no user involved):

```
POST {OIDC_ISSUER}/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id=sa-bcordes-bff
client_secret=<secret>
scope=inquiries.read inquiries.write
```

### Token Caching with Distributed Lock

**File:** `src/lib/wallow/service-client.ts` (Lines 82-122)

```
getServiceToken()
    │
    ├─ Check Valkey cache: bcordes:service-token
    │   ├─ Cached & valid? → return cached token
    │   └─ Not cached or expiring within 30s?
    │       │
    │       ├─ Try acquire lock: bcordes:lock:service-token (NX, EX 10)
    │       │   ├─ Lock acquired?
    │       │   │   ├─ YES: clientCredentialsGrant() → cache in Valkey → release lock
    │       │   │   └─ NO: Poll for cached token every 100ms (up to 1s)
    │       │   │       ├─ Found? → return it
    │       │   │       └─ Timeout? → call clientCredentialsGrant() directly (fallback)
    │       │   │
    │       │   └─ Return token
    │       │
    │       └─ Return token
    │
    └─ Attach as: Authorization: Bearer {serviceToken}
```

### When Is the Service Client Used?

- `submitInquiry` — when an anonymous user submits a contact form
- Any server-side operation that doesn't need a specific user's permissions

---

## 12. Real-Time: SSE Stream Authentication

### Server Side

**File:** `src/routes/api/notifications/stream.ts` (Lines 59-75)

```typescript
const session = await getSession()
if (!session?.accessToken) {
  return new Response('Unauthorized', { status: 401 })
}
```

The SSE endpoint:

1. Checks for a valid session with access token
2. Opens a proxy connection to Wallow's event stream:
   ```
   GET {WALLOW_API_URL}/events?subscribe=Notifications,Inquiries
   Authorization: Bearer {accessToken}
   ```
3. Pipes events from Wallow to the browser
4. Sends keepalive pings every 30 seconds
5. Auto-closes after 4 hours (forces reconnect)
6. If the upstream connection drops, refreshes token and reconnects

### Client Side

**File:** `src/hooks/EventStreamProvider.tsx` (Lines 211-216)

```typescript
useEffect(() => {
  if (!user) {
    setStatus('disconnected')
    return
  }
  // Connect to /api/notifications/stream via EventSource
}, [user, connect, dispatchEnvelope, startHeartbeat])
```

The browser connects to `/api/notifications/stream` using `EventSource`. Authentication happens via the `__session` cookie (automatically sent by the browser since it's `SameSite=Lax` and same-origin).

---

## 13. Logout Flow

### UI Trigger

**File:** `src/components/layout/UserMenu.tsx` (Lines 70-87)

```typescript
onClick={(e) => {
  e.preventDefault()
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/auth/logout'
  document.body.appendChild(form)
  form.submit()
}
```

**Why a form POST?** Logout should be a POST (not a GET link) to prevent CSRF — a malicious site can't trigger a GET-based logout by embedding an image tag. The dynamic form creation is a pattern for triggering POST navigation from JavaScript.

### Server Handler

**File:** `src/routes/auth/logout.ts` (Lines 5-28)

```
Browser POST /auth/logout
         │
         ▼
┌─ Logout Handler ──────────────────────────┐
│                                            │
│  1. Get current session (for idToken)      │
│  2. clearSession()                         │
│     • Delete __session cookie              │
│     • Fire-and-forget Valkey cleanup       │
│  3. Build OIDC logout URL:                 │
│     {issuer}/connect/logout?               │
│       id_token_hint={idToken}              │
│       post_logout_redirect_uri={origin}/   │
│  4. Return 302 to OIDC logout              │
│                                            │
└────────────────────────────────────────────┘
         │
         ▼
Browser redirected to OIDC logout endpoint
         │
         ▼ (OIDC clears its own session)
         │
         ▼
Browser redirected back to https://bcordes.dev/
```

**`id_token_hint`:** Tells the OIDC provider which session to end. Without it, the provider might show a "which account do you want to log out?" prompt.

**`post_logout_redirect_uri`:** Where to send the user after OIDC logout. Uses `new URL(request.url).origin` + `/` — the origin of the current request.

> **Production concern:** If the request comes through a reverse proxy, `request.url` might have the internal origin (e.g., `http://localhost:3000`) instead of the public origin (`https://bcordes.dev`). This would cause the post-logout redirect to fail or redirect to an internal URL. **This needs to be verified.**

---

## 14. Production Concerns: Reverse Proxy & URLs

### URLs That Must Be Correct

| URL                            | Set By                      | Must Match                                                                                                  | Why                                                       |
| ------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `OIDC_REDIRECT_URI`            | Env var                     | Wallow's registered redirect URIs AND the URL the browser actually navigates to                             | OIDC provider rejects mismatched redirect URIs            |
| `OIDC_ISSUER`                  | Env var                     | Must be reachable from the BFF server AND its `.well-known/openid-configuration` must return valid metadata | Used for discovery, token exchange, and userinfo          |
| `WALLOW_API_URL`               | Env var                     | Must be reachable from the BFF server                                                                       | Used for all API calls (server-to-server)                 |
| `request.url` in callback      | Computed                    | Must match `OIDC_REDIRECT_URI`                                                                              | `openid-client` validates the callback URL                |
| `post_logout_redirect_uri`     | Computed from `request.url` | Must be registered in Wallow's allowed post-logout redirect URIs                                            | OIDC provider rejects unregistered URIs                   |
| Origin for returnTo validation | Computed from `request.url` | Must be the public origin                                                                                   | Prevents open redirect but could break if origin is wrong |

### Common Reverse Proxy Issues

#### 1. `request.url` Has Wrong Origin

If Nginx/Caddy/Traefik terminates TLS and proxies to `http://localhost:3000`:

```
Browser: https://bcordes.dev/auth/callback?code=abc
Reverse Proxy → http://localhost:3000/auth/callback?code=abc
```

The `request.url` inside the handler might be `http://localhost:3000/auth/callback?code=abc` instead of `https://bcordes.dev/auth/callback?code=abc`.

**Fix:** Configure the reverse proxy to set `X-Forwarded-Host`, `X-Forwarded-Proto`, and ensure Nitro/H3 reads them. Or set `OIDC_REDIRECT_URI` to the internal URL and register that in Wallow (less ideal).

#### 2. Cookie Domain Issues

The `__session` cookie has no explicit `Domain` attribute. This means it defaults to the exact origin domain. If the reverse proxy serves from `bcordes.dev` but the app thinks it's `localhost:3000`, cookies might not be sent correctly.

#### 3. OIDC Discovery URL vs API URL

If `OIDC_ISSUER=https://api.wallow.dev` but the server can't reach that URL (e.g., it should be `http://wallow-api:5000` internally), discovery will fail.

**But:** The OIDC discovery response contains URLs like `token_endpoint: "https://api.wallow.dev/connect/token"`. If the server uses these URLs for token exchange, they must also be reachable from the server. Some setups require the server to reach the public URL even from inside the network.

#### 4. `post_logout_redirect_uri` Computed Wrong

In `src/routes/auth/logout.ts`, the origin is extracted from `request.url`:

```typescript
const origin = new URL(request.url).origin
const logoutUrl = await getLogoutUrl(idTokenHint, `${origin}/`)
```

If `request.url` is `http://localhost:3000/auth/logout`, the redirect URI becomes `http://localhost:3000/` — which probably isn't registered in Wallow.

### Checklist for Production Deployment

- [ ] `OIDC_REDIRECT_URI` matches the public URL exactly (protocol, domain, port, path)
- [ ] `OIDC_REDIRECT_URI` is registered in Wallow's allowed redirect URIs for the client
- [ ] `OIDC_ISSUER` is reachable from the BFF server (Docker network or public URL)
- [ ] Discovery metadata URLs (token_endpoint, userinfo_endpoint) are reachable from the BFF
- [ ] `WALLOW_API_URL` is reachable from the BFF server
- [ ] Reverse proxy forwards `X-Forwarded-Host` and `X-Forwarded-Proto` headers
- [ ] Nitro/H3 is configured to trust proxy headers (if behind reverse proxy)
- [ ] Post-logout redirect URI is registered in Wallow
- [ ] Cookie `Secure` flag works with your TLS termination point
- [ ] Valkey is accessible from the BFF server (same Docker network)
- [ ] `SESSION_SECRET` is the same across all BFF instances (if load-balanced)

---

## 15. Claims Mapping & User Object

**File:** `src/lib/auth/claims.ts`

### User Interface

**File:** `src/lib/auth/types.ts` (Lines 1-17)

```typescript
export interface User {
  id: string // JWT 'sub' claim
  name: string // Display name (fallback chain)
  email: string // 'email' claim
  roles: Array<string> // From 'role' claim (string or array)
  permissions: Array<string> // Currently always empty from OIDC
  tenantId: string // From 'org_id' claim
  tenantName: string // From 'org_name' claim
}
```

### Name Resolution (Lines 11-28)

```typescript
export function userFromClaims(claims: Record<string, unknown>): User {
  return {
    id: claims.sub as string,
    name: String(
      claims.name || // 1. Standard name claim
        claims.preferred_username || // 2. Username
        [claims.given_name, claims.family_name].filter(Boolean).join(' ') || // 3. First + Last
        claims.email || // 4. Email as name
        'User', // 5. Default
    ),
    email: String(claims.email ?? ''),
    roles: parseRoles(claims.role), // Handles string, array, or missing
    permissions: [],
    tenantId: String(claims.org_id ?? ''),
    tenantName: String(claims.org_name ?? ''),
  }
}
```

### Role Parsing (Lines 4-8)

```typescript
export function parseRoles(rawRole: unknown): Array<string> {
  if (Array.isArray(rawRole)) return rawRole as Array<string>
  if (typeof rawRole === 'string') return [rawRole]
  return []
}
```

**Why both array and string handling?** JWTs from some OIDC providers put a single role as a string but multiple roles as an array. This normalizes both cases.

### SessionData Interface

**File:** `src/lib/auth/types.ts` (Lines 27-45)

```typescript
export interface SessionData {
  sessionId: string // UUID — used as Valkey key and lock identifier
  accessToken: string // For Bearer auth to Wallow API
  refreshToken: string // Single-use token for renewal
  idToken?: string // For logout (id_token_hint) — optional
  expiresAt: number // Unix timestamp (seconds) when accessToken expires
  user: User // Cached user profile
  version: number // Incremented on each token refresh
  csrfToken?: string // Synchronizer token (generated but not currently validated)
}
```

---

## 16. Quick Reference: All Auth Files

### Core Auth Library

| File                         | Lines | Purpose                                                                             |
| ---------------------------- | ----- | ----------------------------------------------------------------------------------- |
| `src/lib/auth/oidc.ts`       | 165   | OIDC client: discovery, auth URL, token exchange, refresh, userinfo, logout URL     |
| `src/lib/auth/session.ts`    | ~110  | Session CRUD: get/set/clear/seal + distributed refresh lock                         |
| `src/lib/auth/middleware.ts` | ~67   | Auth guards: getAuthUser (auto-refresh), requireAuth (redirect), requireAdmin (403) |
| `src/lib/auth/claims.ts`     | ~28   | JWT claims → User object mapping                                                    |
| `src/lib/auth/types.ts`      | ~46   | TypeScript interfaces: User, SessionData, TokenResult                               |

### Auth Routes

| File                          | Method | Purpose                                                      |
| ----------------------------- | ------ | ------------------------------------------------------------ |
| `src/routes/auth/login.ts`    | GET    | Set PKCE cookies, redirect to OIDC authorize                 |
| `src/routes/auth/callback.ts` | GET    | Validate state, exchange code, create session, redirect home |
| `src/routes/auth/logout.ts`   | POST   | Clear session, redirect to OIDC logout                       |
| `src/routes/auth/me.ts`       | GET    | Return current user JSON (or null)                           |

### Wallow API Clients

| File                               | Purpose                                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| `src/lib/wallow/client.ts`         | User-authenticated client with 401 retry & token refresh     |
| `src/lib/wallow/service-client.ts` | M2M client with client credentials grant & caching           |
| `src/lib/wallow/config.ts`         | `WALLOW_BASE_URL` from env                                   |
| `src/lib/wallow/errors.ts`         | WallowError class, ProblemDetails                            |
| `src/lib/wallow/request.ts`        | Shared: isAuthRedirect, parseProblemDetails, parseRetryDelay |
| `src/lib/wallow/types.ts`          | ProblemDetails, Inquiry, Notification types                  |

### Frontend Auth

| File                                         | Purpose                                    |
| -------------------------------------------- | ------------------------------------------ |
| `src/hooks/useUser.ts`                       | React hook: fetches /auth/me, caches 5 min |
| `src/hooks/EventStreamProvider.tsx`          | SSE connection (auth-gated)                |
| `src/components/layout/UserMenu.tsx`         | Login/logout UI                            |
| `src/components/layout/Header.tsx`           | Admin role checks                          |
| `src/components/layout/MobileNav.tsx`        | Mobile login/logout                        |
| `src/components/layout/NotificationBell.tsx` | Auth-gated notification queries            |
| `src/server-fns/auth.ts`                     | serverRequireAuth server function          |

### Session Infrastructure

| File                      | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `src/lib/valkey/keys.ts`  | Valkey key naming: session, lock, service-token |
| `src/lib/valkey/index.ts` | Valkey client setup                             |

### Valkey Key Patterns

| Key Pattern                        | TTL                | Purpose                    |
| ---------------------------------- | ------------------ | -------------------------- |
| `bcordes:session:{sessionId}`      | 24h                | Full session data          |
| `bcordes:lock:session:{sessionId}` | 10s                | Distributed refresh lock   |
| `bcordes:service-token`            | `expires_in - 30s` | Cached M2M access token    |
| `bcordes:lock:service-token`       | 10s                | Service token refresh lock |

---

## Rethink Notes Summary

Throughout this analysis, several items warranted second thoughts:

1. **Discovery caching** (Section 3): The cached `configPromise` is fine because OIDC metadata is stable and the error-reset pattern handles transient failures. No issue here.

2. **`request.url` in callback** (Section 5): Initially thought it was just used as redirect_uri. Actually, `openid-client` uses it to validate the callback URL against the configured redirect_uri. **This is a production failure point if the reverse proxy changes the URL.**

3. **User profile merge in callback** (Section 5): The merge of token claims and userinfo claims is specifically needed for org claims (`org_id`, `org_name`) that may not appear in the userinfo response. **Worth verifying in the Wallow brainstorm whether userinfo actually returns these.**

4. **requireAdmin doesn't auto-refresh** (Section 8): Uses `getSession()` directly instead of `getAuthUser()`. This means expired tokens result in 403 instead of auto-refresh. Likely intentional for security, but worth noting.

5. **Different user parsing on refresh** (Section 9): `getAuthUser()` calls `fetchUserProfile()` (network call) after refresh. The Wallow client's `refreshSession()` calls `parseUserFromToken()` (JWT decode only). These could produce different user objects if claims differ between token and userinfo.

6. **csrfToken generated but unused** (Section 5): The session includes a CSRF token but no middleware validates it. Either planned for future use or vestigial.

7. **post_logout_redirect_uri computed from request.url** (Section 13): If behind a reverse proxy, this could compute the wrong origin. Same class of bug as the callback URL issue.

8. **`/Account/Login` hardcoded in auth redirect detection** (Section 9): If Wallow changes this path, the detection silently breaks.
