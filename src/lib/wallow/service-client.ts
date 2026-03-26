import {
  allowInsecureRequests,
  clientCredentialsGrant,
  discovery,
} from 'openid-client'
import { setResponseStatus } from '@tanstack/react-start/server'
import { WallowError } from './errors'
import { parseProblemDetails, parseRetryDelay, toNetworkError } from './request'
import { WALLOW_BASE_URL } from './config'
import type { Configuration } from 'openid-client'
import { getValkey, keys } from '@/lib/valkey'

const isDev = process.env.NODE_ENV !== 'production'

const LOCK_TTL_SECONDS = 10
const LOCK_POLL_MS = 100
const LOCK_POLL_MAX_ATTEMPTS = Math.ceil(
  (LOCK_TTL_SECONDS * 1000) / LOCK_POLL_MS,
)

let configPromise: Promise<Configuration> | null = null

function getConfig(): Promise<Configuration> {
  if (!configPromise) {
    const issuer = process.env.OIDC_ISSUER
    if (!issuer) throw new Error('OIDC_ISSUER environment variable is not set')
    configPromise = discovery(
      new URL(issuer),
      process.env.OIDC_SERVICE_CLIENT_ID!,
      process.env.OIDC_SERVICE_CLIENT_SECRET,
      undefined,
      isDev ? { execute: [allowInsecureRequests] } : undefined,
    ).catch((err) => {
      configPromise = null // allow retry on next call
      throw err
    })
  }
  return configPromise
}

async function refreshServiceToken(): Promise<string> {
  const redis = getValkey()
  const config = await getConfig()
  const tokens = await clientCredentialsGrant(config, {
    scope: 'inquiries.write inquiries.read',
  })
  const expiresIn = tokens.expires_in ?? 3600
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
  const ttl = Math.max(expiresIn - 30, 1)

  await redis.set(
    keys.serviceToken(),
    JSON.stringify({ accessToken: tokens.access_token, expiresAt }),
    'EX',
    ttl,
  )

  return tokens.access_token
}

async function pollForCachedToken(): Promise<string | null> {
  const redis = getValkey()
  const now = Math.floor(Date.now() / 1000)

  for (let i = 0; i < LOCK_POLL_MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, LOCK_POLL_MS))
    const cached = await redis.get(keys.serviceToken())
    if (cached) {
      const parsed = JSON.parse(cached) as {
        accessToken: string
        expiresAt: number
      }
      if (parsed.expiresAt - 30 > now) {
        return parsed.accessToken
      }
    }
  }

  return null
}

async function getServiceToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const redis = getValkey()

  // Check Valkey cache first
  const cached = await redis.get(keys.serviceToken())
  if (cached) {
    const parsed = JSON.parse(cached) as {
      accessToken: string
      expiresAt: number
    }
    if (parsed.expiresAt - 30 > now) {
      return parsed.accessToken
    }
  }

  // Try to acquire distributed lock
  const acquired = await redis.set(
    keys.serviceTokenLock(),
    '1',
    'EX',
    LOCK_TTL_SECONDS,
    'NX',
  )

  if (acquired === 'OK') {
    // Won the lock — refresh and release
    try {
      return await refreshServiceToken()
    } finally {
      await redis.del(keys.serviceTokenLock())
    }
  }

  // Lost the lock — another instance is refreshing, poll for the result
  const polled = await pollForCachedToken()
  if (polled) return polled

  // Lock expired without a cached token — try refreshing directly
  return refreshServiceToken()
}

const REQUEST_TIMEOUT_MS = 30_000

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
    await getValkey().del(keys.serviceToken())
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

/** Pre-authenticated Wallow API client using OAuth2 client credentials (service account) */
export const serviceClient = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: unknown) => request('POST', path, body),
  put: (path: string, body?: unknown) => request('PUT', path, body),
  patch: (path: string, body?: unknown) => request('PATCH', path, body),
  delete: (path: string) => request('DELETE', path),
}
