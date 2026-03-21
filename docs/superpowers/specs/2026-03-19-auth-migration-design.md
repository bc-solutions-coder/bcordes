# Auth Migration Design: Keycloak → OpenIddict

**Date:** 2026-03-19
**Scope:** Frontend auth layer — replace Keycloak OIDC with Wallow's OpenIddict endpoints
**Prerequisite:** Wallow backend is implementing ASP.NET Identity + OpenIddict (in progress, separate repo)

## Context

The bcordes frontend currently authenticates via Keycloak using the `arctic` library's KeyCloak class. The Wallow backend is migrating from Keycloak to a self-hosted ASP.NET Identity + OpenIddict provider. This spec covers the frontend-side changes: replacing the OIDC client, auth routes, middleware, and service client to point at Wallow's standard OpenIddict endpoints.

The login/register UI lives on Wallow (redirect-based flow, same pattern as Keycloak). The frontend never renders login forms.

## Architecture

**Library swap:** Replace `arctic` with `openid-client`. openid-client supports OpenID Connect Discovery (fetches `/.well-known/openid-configuration`), eliminating the need to hardcode endpoint URLs.

**Auth flow (unchanged pattern):**
1. User clicks "Sign In" → frontend redirects to Wallow's `/connect/authorize` (via openid-client)
2. User authenticates on Wallow's hosted login page (`/connect/login`)
3. Wallow redirects back to `/auth/callback` with authorization code
4. Frontend exchanges code for tokens via Wallow's `/connect/token`
5. Frontend decodes access token, creates encrypted session cookie

**Service account flow:** M2M calls use openid-client's client credentials grant against the same issuer. No separate token URL needed — discovered automatically.

## Endpoint Conventions

Wallow's OpenIddict exposes standard endpoints:

| Endpoint | Path | Purpose |
|----------|------|---------|
| Authorization | `/connect/authorize` | Start auth code flow |
| Token | `/connect/token` | Exchange code / refresh / client credentials |
| Logout | `/connect/logout` | End session |
| Login UI | `/connect/login` | Wallow-hosted login page |
| Register UI | `/connect/register` | Wallow-hosted registration page |
| Discovery | `/.well-known/openid-configuration` | Auto-discovery of all endpoints |

All endpoints are discovered automatically via openid-client — the frontend only needs the issuer URL.

## Environment Variables

**Remove** (11 vars):
- `VITE_KEYCLOAK_URL`
- `VITE_KEYCLOAK_REALM`
- `VITE_KEYCLOAK_CLIENT_ID`
- `KEYCLOAK_URL`
- `KEYCLOAK_REALM`
- `KEYCLOAK_CLIENT_ID`
- `KEYCLOAK_CLIENT_SECRET`
- `KEYCLOAK_REDIRECT_URI`
- `WALLOW_CLIENT_ID`
- `WALLOW_CLIENT_SECRET`
- `WALLOW_TOKEN_URL`

**Add** (6 vars):
- `OIDC_ISSUER` — Wallow's base URL (e.g., `https://api.bcordes.dev`). openid-client fetches discovery from this.
- `OIDC_CLIENT_ID` — OAuth2 client ID for user-facing auth
- `OIDC_CLIENT_SECRET` — OAuth2 client secret for user-facing auth
- `OIDC_REDIRECT_URI` — Callback URL (e.g., `https://site.bcordes.dev/auth/callback`)
- `OIDC_SERVICE_CLIENT_ID` — OAuth2 client ID for M2M service account
- `OIDC_SERVICE_CLIENT_SECRET` — OAuth2 client secret for M2M service account

## File Changes

### 1. `src/lib/auth/oidc.ts` — Rewrite

Replace the arctic KeyCloak class with openid-client discovery.

**Exports:**
- `getAuthorizationUrl(state, codeVerifier)` — Returns the authorization URL with PKCE challenge
- `exchangeCode(code, codeVerifier)` — Exchanges authorization code for tokens
- `refreshToken(refreshToken)` — Refreshes an access token
- `getLogoutUrl(idTokenHint?, postLogoutRedirectUri?)` — Returns the end_session_endpoint URL with optional id_token_hint
- `parseUserFromToken(accessToken)` — Decodes JWT and extracts User object (moved from current oidc.ts, updated for OpenIddict claims)

**Return types:** `exchangeCode()` and `refreshToken()` return a plain object `{ accessToken: string, refreshToken: string, idToken: string, expiresIn: number }` — not openid-client's raw response object. This keeps consumers (`client.ts`, `middleware.ts`, `callback.ts`) decoupled from the library.

**Implementation:**
- On first call, discover the provider via `OIDC_ISSUER/.well-known/openid-configuration` (cache the config)
- If discovery fetch fails, throw immediately — the server cannot serve auth routes without a valid provider config. Each auth route will return 500. No retry/fallback.
- Use `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` for the client
- PKCE with S256 code challenge (same as current implementation)
- State and code_verifier generation use openid-client's `generators.state()` and `generators.codeVerifier()` (replacing arctic's `generateState` / `generateCodeVerifier`)

### 2. `src/routes/auth/login.ts` — Rewrite

- Generate random state and code_verifier
- Get authorization URL from `oidc.ts`
- Set HttpOnly cookies: `__oauth_state`, `__oauth_code_verifier`, `__oauth_return_to`
- Redirect to the authorization URL

Same logic as today, but using openid-client instead of arctic.

### 3. `src/routes/auth/callback.ts` — Rewrite

- Read state + code_verifier from cookies
- Validate state matches
- Exchange authorization code for tokens via `oidc.ts`
- Decode access token to extract user claims
- Create `SessionData` object, seal with iron-webcrypto, set `__session` cookie
- Clear OAuth cookies, redirect to return URL

**Claim mapping:** OpenIddict may use different claim names than Keycloak. The callback extracts these standard claims from the access token:
- `sub` → user ID
- `name` or `preferred_username` → display name
- `email` → email
- `role` or `roles` → roles array
- `organization` or `org` → organization/tenant info

The exact claim names depend on Wallow's OpenIddict configuration. The mapping should be flexible enough to handle standard OIDC claims.

### 4. `src/routes/auth/logout.ts` — Rewrite

- POST only (405 on GET, same as today)
- Read session to get `idToken` (for `id_token_hint`)
- Clear `__session` cookie
- Get logout URL from `oidc.ts` with `idTokenHint` and `postLogoutRedirectUri`
- Redirect to Wallow's logout endpoint

**Note:** OpenIddict typically requires `id_token_hint` for the `post_logout_redirect_uri` to be honored. The `id_token` is stored in `SessionData` (see types.ts update below).

### 5. `src/routes/auth/me.ts` — No change

Reads from session cookie, not from the OIDC provider.

### 6. `src/lib/auth/middleware.ts` — Update

**`getAuthUser()`:**
- Unseal session (same as today)
- Check token expiry — if within 30s of expiring, refresh via `oidc.ts`'s `refreshToken()`
- Update session with new tokens if refreshed

**`requireAuth()`:**
- No change — checks session existence and redirects to `/auth/login`

### 7. `src/lib/auth/types.ts` — Update

- Add `idToken: string` field to `SessionData` interface (needed for logout `id_token_hint`)
- Add a comment noting that claim mapping happens in `callback.ts` and may need adjustment based on Wallow's OpenIddict claim configuration

### 8. `src/lib/auth/session.ts` — No change

iron-webcrypto session encryption is provider-agnostic.

### 9. `src/lib/wallow/client.ts` — Update

The authenticated Wallow client imports `refreshAccessToken` and `parseUserFromToken` from `oidc.ts` and calls arctic-specific methods on the returned token object (`.accessToken()`, `.refreshToken()`, `.accessTokenExpiresInSeconds()`). Update the token refresh call site to use the new plain-object return type from `oidc.ts`:

```ts
const tokens = await refreshToken(currentSession.refreshToken)
// Now: tokens.accessToken, tokens.refreshToken, tokens.expiresIn (plain properties, not methods)
```

Also add `patch` method to `serviceClient` for consistency (pre-existing gap).

### 10. `src/lib/wallow/service-client.ts` — Rewrite

Replace manual fetch-based client credentials with openid-client:

- Discover provider via same `OIDC_ISSUER`
- Use `OIDC_SERVICE_CLIENT_ID` and `OIDC_SERVICE_CLIENT_SECRET`
- Client credentials grant via openid-client
- Keep token caching with 30s refresh buffer
- Keep inflight deduplication for concurrent requests
- Keep retry-on-429 and RFC 7807 error handling

### 11. `src/routes/login.tsx` — Update

Change the button label from "Sign in with Keycloak" to "Sign in". The href (`/auth/login`) stays the same.

### 12. `.env.example` — Update

Replace Keycloak vars with OIDC vars in the Frontend section.

### 13. `docker-compose.prod.yml` — Update

Update the `web` service environment block: remove `WALLOW_CLIENT_ID`, `WALLOW_CLIENT_SECRET`, `WALLOW_TOKEN_URL`. Add `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `OIDC_SERVICE_CLIENT_ID`, `OIDC_SERVICE_CLIENT_SECRET`.

### 14. `CLAUDE.md` — Update

- Change auth line from "OIDC (migrating...)" to "OIDC via OpenIddict (openid-client)"
- Update environment variables section: remove all `KEYCLOAK_*`, `WALLOW_CLIENT_ID`, `WALLOW_CLIENT_SECRET`, `WALLOW_TOKEN_URL`. Add `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `OIDC_SERVICE_CLIENT_ID`, `OIDC_SERVICE_CLIENT_SECRET`.

### 15. `package.json` — Update

- Remove: `arctic`
- Add: `openid-client`

## What's Deliberately Excluded

- **Wallow-side OpenIddict implementation** — separate repo, in progress
- **Login/register UI** — hosted by Wallow, not this frontend
- **Token introspection / userinfo endpoint** — the frontend decodes the JWT directly (same as today)
- **Multi-tenant claim format changes** — if Wallow's OpenIddict uses a different organization claim format than Keycloak, the claim mapping in `callback.ts` handles it

## Testing Strategy

- Unit test the claim mapping logic (different claim formats → consistent User object)
- Integration testing requires a running Wallow instance with OpenIddict — use the local dev compose stack
- Manual smoke test: login flow, token refresh, logout, service account calls
