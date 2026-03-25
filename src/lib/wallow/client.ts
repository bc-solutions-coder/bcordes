import { setResponseStatus } from '@tanstack/react-start/server'
import { getSession, setSession, withRefreshLock } from '../auth/session'
import { parseUserFromToken, refreshToken } from '../auth/oidc'
import { WallowError } from './errors'
import { isAuthRedirect, parseProblemDetails, parseRetryDelay } from './request'
import type { SessionData } from '../auth/types'

const BASE_URL = process.env.WALLOW_API_URL!

interface WallowClient {
  get: (path: string) => Promise<Response>
  post: (path: string, body?: unknown) => Promise<Response>
  put: (path: string, body?: unknown) => Promise<Response>
  patch: (path: string, body?: unknown) => Promise<Response>
  delete: (path: string) => Promise<Response>
}

function buildFetchOptions(
  method: string,
  accessToken: string,
  path: string,
  body?: unknown,
): RequestInit {
  return {
    method,
    redirect: 'manual',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }
}

function doFetch(
  path: string,
  method: string,
  accessToken: string,
  body?: unknown,
): Promise<Response> {
  return fetch(
    `${BASE_URL}${path}`,
    buildFetchOptions(method, accessToken, path, body),
  )
}

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
    let response = await doFetch(path, method, currentSession.accessToken, body)

    if (response.status === 401 || isAuthRedirect(response)) {
      currentSession = await refreshSession(currentSession)
      response = await doFetch(path, method, currentSession.accessToken, body)
    }

    if (response.status === 429) {
      await new Promise((resolve) =>
        setTimeout(resolve, parseRetryDelay(response)),
      )
      response = await doFetch(path, method, currentSession.accessToken, body)
    }

    if (!response.ok) {
      const problem = await parseProblemDetails(response, method, path)
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
