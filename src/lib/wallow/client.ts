import { setResponseStatus } from '@tanstack/react-start/server'
import { getSession, setSession, withRefreshLock } from '../auth/session'
import { parseUserFromToken, refreshToken } from '../auth/oidc'
import { WallowError } from './errors'
import type { ProblemDetails } from './types'
import type { SessionData } from '../auth/types'

const BASE_URL = process.env.WALLOW_API_URL!

interface WallowClient {
  get: (path: string) => Promise<Response>
  post: (path: string, body?: unknown) => Promise<Response>
  put: (path: string, body?: unknown) => Promise<Response>
  patch: (path: string, body?: unknown) => Promise<Response>
  delete: (path: string) => Promise<Response>
}

/** Create an authenticated HTTP client for the Wallow backend API */
export async function createWallowClient(): Promise<WallowClient> {
  const session = await getSession()
  if (!session) {
    setResponseStatus(401)
    throw new Error('No active session')
  }

  async function request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    let currentSession = (await getSession())!

    const doFetch = (accessToken: string) =>
      fetch(`${BASE_URL}${path}`, {
        method,
        redirect: 'manual',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      })

    let response = await doFetch(currentSession.accessToken)

    // Wallow redirects to /Account/Login instead of returning 401 when token is invalid
    const isAuthRedirect = (r: Response) =>
      r.status >= 300 &&
      r.status < 400 &&
      (r.headers.get('location') ?? '').includes('/Account/Login')

    if (response.status === 401 || isAuthRedirect(response)) {
      const refreshed = await withRefreshLock(
        currentSession.sessionId,
        async () => {
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
        },
      )
      currentSession = refreshed
      response = await doFetch(refreshed.accessToken)
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const ms = retryAfter ? Number(retryAfter) * 1000 : 1000
      await new Promise((resolve) => setTimeout(resolve, ms))
      response = await doFetch(currentSession.accessToken)
    }

    if (!response.ok) {
      let problem: ProblemDetails
      try {
        problem = await response.json()
        console.error(
          `[wallow] ${method} ${path} → ${response.status}`,
          problem,
        )
      } catch {
        console.error(
          `[wallow] ${method} ${path} → ${response.status} (no JSON body)`,
        )
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

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  }
}
