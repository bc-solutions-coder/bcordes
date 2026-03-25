import {
  allowInsecureRequests,
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  fetchUserInfo,
  randomPKCECodeVerifier,
  randomState,
  refreshTokenGrant,
} from 'openid-client'
import type { Configuration } from 'openid-client'
import type { User } from './types'

export { randomState, randomPKCECodeVerifier }

export interface TokenResult {
  accessToken: string
  refreshToken: string
  idToken: string
  expiresIn: number
  subject: string
}

// ---------------------------------------------------------------------------
// Discovery / config cache
// ---------------------------------------------------------------------------

let configPromise: Promise<Configuration> | null = null

const isDev = process.env.NODE_ENV !== 'production'

function getConfig(): Promise<Configuration> {
  if (!configPromise) {
    const issuer = process.env.OIDC_ISSUER
    if (!issuer) throw new Error('OIDC_ISSUER environment variable is not set')
    const clientId = process.env.OIDC_CLIENT_ID
    if (!clientId) throw new Error('OIDC_CLIENT_ID environment variable is not set')
    const redirectUri = process.env.OIDC_REDIRECT_URI
    if (!redirectUri)
      throw new Error('OIDC_REDIRECT_URI environment variable is not set')
    configPromise = discovery(
      new URL(issuer),
      clientId,
      process.env.OIDC_CLIENT_SECRET,
      undefined,
      isDev ? { execute: [allowInsecureRequests] } : undefined,
    ).catch((err) => {
      configPromise = null // allow retry on next call
      throw err
    })
  }
  return configPromise
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the authorization URL string with PKCE challenge. */
export async function getAuthorizationUrl(
  state: string,
  codeVerifier: string,
): Promise<string> {
  const config = await getConfig()
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier)
  const url = buildAuthorizationUrl(config, {
    redirect_uri: process.env.OIDC_REDIRECT_URI!,
    scope:
      'openid profile email roles offline_access inquiries.read inquiries.write notifications.read notifications.write',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return url.href
}

/** Exchanges an authorization code for tokens. */
export async function exchangeCode(
  _code: string,
  codeVerifier: string,
  callbackUrl: string,
  expectedState: string,
): Promise<TokenResult> {
  const config = await getConfig()
  const tokens = await authorizationCodeGrant(config, new URL(callbackUrl), {
    pkceCodeVerifier: codeVerifier,
    expectedState,
  })
  const claims = tokens.claims()
  const subject = claims?.sub ?? ''
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? '',
    idToken: tokens.id_token ?? '',
    expiresIn: tokens.expires_in ?? 0,
    subject,
  }
}

/** Refreshes an access token using a refresh token. */
export async function refreshToken(rt: string): Promise<TokenResult> {
  const config = await getConfig()
  const tokens = await refreshTokenGrant(config, rt)
  const claims = tokens.claims()
  const subject = claims?.sub ?? ''
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? rt,
    idToken: tokens.id_token ?? '',
    expiresIn: tokens.expires_in ?? 0,
    subject,
  }
}

/** Returns the end_session_endpoint URL string. */
export async function getLogoutUrl(
  idTokenHint?: string,
  postLogoutRedirectUri?: string,
): Promise<string> {
  const config = await getConfig()
  const endSessionEndpoint =
    config.serverMetadata().end_session_endpoint ??
    `${process.env.OIDC_ISSUER!.replace(/\/$/, '')}/connect/logout`

  const url = new URL(endSessionEndpoint)
  if (idTokenHint) url.searchParams.set('id_token_hint', idTokenHint)
  if (postLogoutRedirectUri)
    url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
  return url.href
}

/** Fetches user info from the OIDC userinfo endpoint using the access token. */
export async function fetchUserProfile(
  accessToken: string,
  expectedSubject: string,
): Promise<User> {
  const config = await getConfig()
  const claims = await fetchUserInfo(config, accessToken, expectedSubject)

  const rawRole = claims.role as unknown
  const roles: Array<string> = Array.isArray(rawRole)
    ? (rawRole as Array<string>)
    : typeof rawRole === 'string'
      ? [rawRole]
      : []

  const tenantId = String(claims.org_id ?? '')
  const tenantName = String(claims.org_name ?? '')

  return {
    id: claims.sub,
    name: ((claims.name ??
      claims.preferred_username ??
      [claims.given_name, claims.family_name].filter(Boolean).join(' ')) ||
      (claims.email as string) ||
      'User'),
    email: String(claims.email ?? ''),
    roles,
    permissions: [],
    tenantId,
    tenantName,
  }
}

/**
 * Decodes a JWT payload and extracts a User object.
 * Accepts either a standard JWT (id_token) or falls back to the id_token
 * when the access_token is an opaque/encrypted token (OpenIddict default).
 */
export function parseUserFromToken(token: string): User {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error(
      'Token is not a valid JWT — use the id_token instead of an opaque access_token',
    )
  }
  const json = Buffer.from(
    parts[1].replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString('utf-8')
  const claims = JSON.parse(json) as Record<string, unknown>

  const rawRole = claims.role
  const roles: Array<string> = Array.isArray(rawRole)
    ? (rawRole as Array<string>)
    : typeof rawRole === 'string'
      ? [rawRole]
      : []

  const tenantId = String(claims.org_id ?? '')
  const tenantName = String(claims.org_name ?? '')

  return {
    id: claims.sub as string,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- claims are Record<string, unknown>
    name: ((claims.name ??
      claims.preferred_username ??
      [claims.given_name, claims.family_name].filter(Boolean).join(' ')) ||
      (claims.email as string) ||
      'User') as string,
    email: String(claims.email ?? ''),
    roles,
    permissions: [],
    tenantId,
    tenantName,
  }
}
