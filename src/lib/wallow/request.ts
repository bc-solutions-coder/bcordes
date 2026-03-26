import { WallowError } from './errors'
import type { ProblemDetails } from './types'

/** Check if a response is an auth redirect (Wallow returns 3xx to /Account/Login instead of 401). */
export function isAuthRedirect(response: Response): boolean {
  return (
    response.status >= 300 &&
    response.status < 400 &&
    (response.headers.get('location') ?? '').includes('/Account/Login')
  )
}

/** Build a ProblemDetails object from a non-JSON error response. */
export function buildFallbackProblem(response: Response): ProblemDetails {
  return {
    type: `https://httpstatuses.com/${response.status}`,
    title: response.statusText || 'Request Failed',
    status: response.status,
    detail: `Wallow API returned ${response.status}`,
    traceId: '',
    code: `HTTP_${response.status}`,
  }
}

/** Parse a ProblemDetails from a response body, falling back to a synthetic one. */
export async function parseProblemDetails(
  response: Response,
  method: string,
  path: string,
): Promise<ProblemDetails> {
  try {
    const problem = (await response.json()) as ProblemDetails
    console.error(
      `[wallow] ${method} ${path} → ${problem.status} ${problem.code} ${problem.title}`,
    )
    return problem
  } catch {
    console.error(
      `[wallow] ${method} ${path} → ${response.status} (no JSON body)`,
    )
    return buildFallbackProblem(response)
  }
}

/** Calculate a retry delay from a Retry-After header (seconds) or default to 1s. */
export function parseRetryDelay(response: Response): number {
  const retryAfter = response.headers.get('Retry-After')
  return retryAfter ? Number(retryAfter) * 1000 : 1000
}

/** Convert a network-level fetch error (timeout, connection reset, etc.) into a WallowError. */
export function toNetworkError(
  err: unknown,
  method: string,
  path: string,
): WallowError {
  const message = err instanceof Error ? err.message : 'Network request failed'
  const isTimeout =
    (err instanceof Error && err.name === 'TimeoutError') ||
    (err instanceof TypeError &&
      err.cause instanceof Error &&
      err.cause.message.includes('Timeout'))
  const code = isTimeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR'
  console.error(`[wallow] ${method} ${path} → ${code}: ${message}`)
  return new WallowError({
    type: 'https://httpstatuses.com/503',
    title: isTimeout ? 'Request Timeout' : 'Network Error',
    status: 503,
    detail: `${method} ${path}: ${message}`,
    traceId: '',
    code,
  })
}
