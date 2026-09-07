# Authentication and access

Wallow supplies identity and API permissions. `@bcordes/auth` adapts its SDK to TanStack Start. For registration and runtime settings, see [deployment](deployment.md) and [configuration](configuration.md).

## Sign in and read the current user

Link to `/bff/login`, optionally with a URL-encoded `returnTo`. Call the SDK's `logout()` browser helper to sign out. It handles the logout request's CSRF token. The [host middleware](../apps/web/src/start.ts) mounts SDK handlers under `/bff/*`.

Use `useUser()` from `@/shared/auth` in components. It reads `/auth/me`, which returns the application user or `null` with `Cache-Control: no-store`. The client query has a five-minute stale time. Use server-side checks for access decisions.

[`getAuthUser()`](../packages/auth/src/middleware.ts) combines the SDK session's organization with the API's current-user profile, roles, and expanded permissions. It rejects a profile whose ID differs from the session subject. A missing session or API 401 yields `null`; other API failures propagate.

## Protect a feature

Call `requireAuth()` inside each protected server function. A route's `beforeLoad` check improves navigation but does not replace the function's check. `requireAuth(returnTo)` redirects unauthenticated requests to sign-in.

Use `requireAdmin()` only for the inquiry staff boundary it currently implements. Despite its name, it checks the expanded `InquiriesRead` permission. A role name or OAuth scope alone does not satisfy this check.

The [inquiry server functions](../apps/web/src/features/inquiries/server-fns/inquiries.ts) implement the resource rules:

- Staff can list all inquiries and update status.
- Other authenticated users can read and comment on their own inquiries. Access to another user's inquiry returns 404.
- Customers never receive internal comments and cannot submit one.
- Anonymous submissions use the separate inquiry service client. If a session reference exists but no valid user can be resolved, submission returns 401 instead of falling back to anonymous access.

Keep resource checks in server functions when adding operations. Hiding a button does not authorize its endpoint.

## Session and request boundaries

The published SDK owns OIDC, PKCE/state checks, session cookies, refresh locking, logout, and back-channel revocation. The [BFF adapter](../packages/auth/src/bff.ts) requires `REDIS_URL` and stores sessions through `ValkeySessionStore`. Production rejects an insecure cookie configuration.

[`createRequestSdk()`](../packages/auth/src/sdk.ts) creates a client for the current server request. It forwards cookies, the session CSRF token, and forwarding headers through the SDK BFF in process, retains the transport peer, and propagates refreshed cookies to the response. Do not share an authenticated SDK client between requests.

Browser API access is limited to `/api/health` and the exact GET stream `/api/events?subscribe=Notifications,Inquiries`. Other `/api/*` paths return 404. Product operations go through feature server functions.

The SDK handles CSRF for its endpoints. Other application mutations must supply an `Origin` matching the configured callback origin; missing or mismatched origins return 403. [Security headers](../packages/server/src/security-headers.ts) block framing and MIME sniffing, restrict objects and base URLs, and enable HSTS in production. The CSP does not restrict scripts with nonces.

Local checks cover these adapters. Deployed identity-provider behavior and remaining platform capabilities still require the [Wallow release verification](https://github.com/bc-solutions-coder/bcordes/issues/31).
