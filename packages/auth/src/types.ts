/** Authenticated user identity resolved from an OIDC JWT */
export interface User {
  /** OIDC JWT sub claim */
  id: string
  /** Profile display name claim */
  name: string
  /** Email claim */
  email: string
  /** Roles assigned to the user (e.g. admin, manager, user) */
  roles: Array<string>
  /** Permissions expanded from roles by Wallow */
  permissions: Array<string>
  /** Tenant identifier from the organization claim */
  tenantId: string
  /** Tenant display name from the organization claim */
  tenantName: string
}

/**
 * Required environment variables for OIDC integration:
 *   OIDC_ISSUER            — Base URL of the OIDC server (e.g. https://auth.example.com)
 *   OIDC_CLIENT_ID         — OAuth2 client identifier
 *   OIDC_CLIENT_SECRET     — OAuth2 client secret
 *   OIDC_REDIRECT_URI      — Post-login redirect URI
 */

/** Session state stored server-side for an authenticated user */
export interface SessionData {
  /** Mutex key used to coordinate concurrent token refresh */
  sessionId: string
  /** OIDC JWT access token */
  accessToken: string
  /** Single-use OIDC refresh token */
  refreshToken: string
  /** OIDC id_token, used for logout id_token_hint (optional, may be empty to keep cookie small) */
  idToken?: string
  /** Token expiry as a Unix timestamp (seconds) */
  expiresAt: number
  /** Cached user info derived from the last decoded JWT */
  user: User
  /** Incremented on each refresh to detect stale reads */
  version: number
  /** CSRF synchronizer token for subdomain attack protection */
  csrfToken?: string
}
