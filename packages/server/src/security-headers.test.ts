import { expect, it, vi } from 'vitest'
import { applySecurityHeaders } from './security-headers'

it('preserves redirects and multiple session cookies while adding security headers', () => {
  const headers = new Headers({
    Location: '/dashboard',
    'Content-Type': 'text/plain',
  })
  headers.append('Set-Cookie', 'session=a; HttpOnly')
  headers.append('Set-Cookie', 'csrf=b')
  const response = applySecurityHeaders(
    new Response(null, { status: 302, headers }),
  )
  expect(response.status).toBe(302)
  expect(response.headers.get('location')).toBe('/dashboard')
  expect(response.headers.getSetCookie()).toEqual([
    'session=a; HttpOnly',
    'csrf=b',
  ])
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  expect(response.headers.get('content-security-policy')).toContain(
    "frame-ancestors 'none'",
  )
})

it('preserves event-stream content type and readable response body', async () => {
  const response = applySecurityHeaders(
    new Response('data: event\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    }),
  )
  expect(response.headers.get('content-type')).toBe('text/event-stream')
  expect(await response.text()).toBe('data: event\n\n')
})

it('requires HTTPS for production responses while preserving their contents', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  try {
    const response = applySecurityHeaders(new Response('secure page'))
    expect(response.headers.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains',
    )
    expect(await response.text()).toBe('secure page')
  } finally {
    vi.unstubAllEnvs()
  }
})
