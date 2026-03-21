import { discovery, clientCredentialsGrant, allowInsecureRequests, type Configuration } from 'openid-client'
import type { ProblemDetails } from './types'
import { WallowError } from './errors'
import { setResponseStatus } from '@tanstack/react-start/server'

const BASE_URL = process.env.WALLOW_API_URL!

interface TokenCache {
  accessToken: string
  expiresAt: number // unix seconds
}

const isDev = process.env.NODE_ENV !== 'production'

let configPromise: Promise<Configuration> | null = null
let tokenCache: TokenCache | null = null
let inflightRefresh: Promise<string> | null = null

function getConfig(): Promise<Configuration> {
  if (!configPromise) {
    const issuer = process.env.OIDC_ISSUER
    if (!issuer) throw new Error('OIDC_ISSUER environment variable is not set')
    configPromise = discovery(
      new URL(issuer),
      process.env.OIDC_SERVICE_CLIENT_ID!,
      process.env.OIDC_SERVICE_CLIENT_SECRET!,
      undefined,
      isDev ? { execute: [allowInsecureRequests] } : undefined,
    ).catch((err) => {
      configPromise = null // allow retry on next call
      throw err
    })
  }
  return configPromise
}

async function getServiceToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  if (tokenCache && tokenCache.expiresAt - 30 > now) {
    return tokenCache.accessToken
  }

  if (inflightRefresh) {
    return inflightRefresh
  }

  inflightRefresh = fetchServiceToken().finally(() => {
    inflightRefresh = null
  })

  return inflightRefresh
}

async function fetchServiceToken(): Promise<string> {
  const config = await getConfig()
  const tokens = await clientCredentialsGrant(config, {
    scope: 'inquiries.write inquiries.read',
  })
  const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600)
  tokenCache = { accessToken: tokens.access_token, expiresAt }
  return tokenCache.accessToken
}

async function request(method: string, path: string, body?: unknown): Promise<Response> {
  const token = await getServiceToken()

  const doFetch = (accessToken: string) =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })

  let response = await doFetch(token)

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const ms = retryAfter ? Number(retryAfter) * 1000 : 1000
    await new Promise((resolve) => setTimeout(resolve, ms))
    response = await doFetch(token)
  }

  if (!response.ok) {
    let problem: ProblemDetails
    try {
      problem = await response.json()
    } catch {
      problem = {
        type: `https://httpstatuses.com/${response.status}`,
        title: response.statusText || 'Request Failed',
        status: response.status,
        detail: `Wallow API returned ${response.status}`,
        traceId: '',
        code: `HTTP_${response.status}`,
      }
    }
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
