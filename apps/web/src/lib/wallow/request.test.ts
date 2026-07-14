import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildFallbackProblem,
  isAuthRedirect,
  parseProblemDetails,
  parseRetryDelay,
  toNetworkError,
} from './request'
import { WallowError } from './errors'

vi.mock('@/lib/logger', () => {
  const child = () => mockLogger
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child,
  }
  return { default: mockLogger }
})

function mockResponse(
  opts: Partial<{
    status: number
    statusText: string
    headers: Headers
    json: ReturnType<typeof vi.fn>
  }> = {},
): Response {
  return {
    status: opts.status ?? 200,
    statusText: opts.statusText ?? 'OK',
    headers: opts.headers ?? new Headers(),
    json: opts.json ?? vi.fn(),
  } as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('isAuthRedirect', () => {
  it('returns true for 302 with /Account/Login in location', () => {
    const res = mockResponse({
      status: 302,
      headers: new Headers({
        location: 'https://auth.example.com/Account/Login?returnUrl=/',
      }),
    })
    expect(isAuthRedirect(res)).toBe(true)
  })

  it('returns true for other 3xx with /Account/Login in location', () => {
    const res = mockResponse({
      status: 301,
      headers: new Headers({ location: '/Account/Login' }),
    })
    expect(isAuthRedirect(res)).toBe(true)
  })

  it('returns false for 302 without /Account/Login', () => {
    const res = mockResponse({
      status: 302,
      headers: new Headers({ location: 'https://example.com/other' }),
    })
    expect(isAuthRedirect(res)).toBe(false)
  })

  it('returns false for 302 with no location header', () => {
    const res = mockResponse({ status: 302 })
    expect(isAuthRedirect(res)).toBe(false)
  })

  it('returns false for 200 response', () => {
    const res = mockResponse({ status: 200 })
    expect(isAuthRedirect(res)).toBe(false)
  })

  it('returns false for 400-level status even with login location', () => {
    const res = mockResponse({
      status: 401,
      headers: new Headers({ location: '/Account/Login' }),
    })
    expect(isAuthRedirect(res)).toBe(false)
  })
})

describe('buildFallbackProblem', () => {
  it('builds ProblemDetails with status code in type URL', () => {
    const res = mockResponse({ status: 404, statusText: 'Not Found' })
    const problem = buildFallbackProblem(res)

    expect(problem.type).toBe('https://httpstatuses.com/404')
    expect(problem.status).toBe(404)
    expect(problem.code).toBe('HTTP_404')
    expect(problem.title).toBe('Not Found')
    expect(problem.detail).toBe('Wallow API returned 404')
    expect(problem.traceId).toBe('')
  })

  it('uses "Request Failed" as title when statusText is empty', () => {
    const res = mockResponse({ status: 500, statusText: '' })
    const problem = buildFallbackProblem(res)

    expect(problem.title).toBe('Request Failed')
    expect(problem.code).toBe('HTTP_500')
  })
})

describe('parseProblemDetails', () => {
  it('returns ProblemDetails from response JSON', async () => {
    const serverProblem = {
      type: 'https://example.com/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'Resource not found',
      traceId: 'abc-123',
      code: 'RESOURCE_NOT_FOUND',
    }
    const res = mockResponse({
      status: 404,
      json: vi.fn().mockResolvedValue(serverProblem),
    })

    const result = await parseProblemDetails(res, 'GET', '/api/items/1')
    expect(result).toEqual(serverProblem)
  })

  it('falls back to buildFallbackProblem when json() throws', async () => {
    const res = mockResponse({
      status: 502,
      statusText: 'Bad Gateway',
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })

    const result = await parseProblemDetails(res, 'POST', '/api/items')

    expect(result.type).toBe('https://httpstatuses.com/502')
    expect(result.status).toBe(502)
    expect(result.code).toBe('HTTP_502')
    expect(result.title).toBe('Bad Gateway')
  })
})

describe('parseRetryDelay', () => {
  it('returns delay in ms from Retry-After header in seconds', () => {
    const res = mockResponse({
      headers: new Headers({ 'Retry-After': '5' }),
    })
    expect(parseRetryDelay(res)).toBe(5000)
  })

  it('returns default 1000ms when Retry-After header is absent', () => {
    const res = mockResponse()
    expect(parseRetryDelay(res)).toBe(1000)
  })

  it('handles fractional seconds', () => {
    const res = mockResponse({
      headers: new Headers({ 'Retry-After': '2.5' }),
    })
    expect(parseRetryDelay(res)).toBe(2500)
  })
})

describe('toNetworkError', () => {
  it('returns WallowError with status 503', () => {
    const err = new Error('fetch failed')
    const result = toNetworkError(err, 'GET', '/api/test')

    expect(result).toBeInstanceOf(WallowError)
    expect(result.status).toBe(503)
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.message).toContain('fetch failed')
  })

  it('produces NETWORK_TIMEOUT code for TimeoutError', () => {
    const err = new Error('The operation timed out')
    err.name = 'TimeoutError'
    const result = toNetworkError(err, 'POST', '/api/data')

    expect(result).toBeInstanceOf(WallowError)
    expect(result.status).toBe(503)
    expect(result.code).toBe('NETWORK_TIMEOUT')
  })

  it('produces NETWORK_TIMEOUT for TypeError with Timeout cause', () => {
    const cause = new Error('Timeout waiting for response')
    const err = new TypeError('fetch failed', { cause })
    const result = toNetworkError(err, 'GET', '/api/slow')

    expect(result.code).toBe('NETWORK_TIMEOUT')
  })

  it('handles non-Error values gracefully', () => {
    const result = toNetworkError('string error', 'DELETE', '/api/item')

    expect(result).toBeInstanceOf(WallowError)
    expect(result.status).toBe(503)
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.message).toContain('Network request failed')
  })

  it('includes method and path in detail', () => {
    const err = new Error('connection reset')
    const result = toNetworkError(err, 'PUT', '/api/resource')

    expect(result.message).toContain('PUT')
    expect(result.message).toContain('/api/resource')
  })
})
