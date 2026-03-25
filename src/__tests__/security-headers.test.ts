import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock h3 so we can capture what the middleware does
const mockSetHeaders = vi.fn()
const mockEvent = { node: { req: {}, res: {} } }

vi.mock('h3', () => ({
  defineEventHandler: (handler: (event: unknown) => void) => handler,
  setHeaders: (...args: unknown[]) => mockSetHeaders(...args),
}))

// Import after mocking
import securityHeaders from '@/server/middleware/security-headers'

describe('security-headers middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function callMiddleware() {
    const handler = securityHeaders as unknown as (event: unknown) => void
    handler(mockEvent)
  }

  function getSetHeaders(): Record<string, string> {
    // setHeaders should have been called with (event, headersObject)
    const call = mockSetHeaders.mock.calls[0]
    if (!call) return {}
    return call[1] as Record<string, string>
  }

  it('should call setHeaders on the event', () => {
    callMiddleware()
    expect(mockSetHeaders).toHaveBeenCalledOnce()
    expect(mockSetHeaders).toHaveBeenCalledWith(mockEvent, expect.any(Object))
  })

  it('should set Content-Security-Policy header', () => {
    callMiddleware()
    const headers = getSetHeaders()
    expect(headers).toHaveProperty('Content-Security-Policy')
    expect(headers['Content-Security-Policy']).toBeTruthy()
  })

  it('should set Strict-Transport-Security header', () => {
    callMiddleware()
    const headers = getSetHeaders()
    expect(headers).toHaveProperty('Strict-Transport-Security')
    expect(headers['Strict-Transport-Security']).toMatch(/max-age=/)
  })

  it('should set X-Content-Type-Options to nosniff', () => {
    callMiddleware()
    const headers = getSetHeaders()
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })

  it('should set X-Frame-Options to DENY', () => {
    callMiddleware()
    const headers = getSetHeaders()
    expect(headers['X-Frame-Options']).toBe('DENY')
  })

  it('should set Referrer-Policy to strict-origin-when-cross-origin', () => {
    callMiddleware()
    const headers = getSetHeaders()
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })

  it('should set Permissions-Policy disabling camera, microphone, and geolocation', () => {
    callMiddleware()
    const headers = getSetHeaders()
    expect(headers).toHaveProperty('Permissions-Policy')
    const policy = headers['Permissions-Policy']
    expect(policy).toContain('camera=()')
    expect(policy).toContain('microphone=()')
    expect(policy).toContain('geolocation=()')
  })
})
