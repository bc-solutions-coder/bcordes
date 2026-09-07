import { expect, it } from 'vitest'
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

it('keeps streamed response content readable', async () => {
  const response = applySecurityHeaders(
    new Response('data: event\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    }),
  )
  expect(response.headers.get('content-type')).toBe('text/event-stream')
  expect(await response.text()).toBe('data: event\n\n')
})
