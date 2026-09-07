/** Headers compatible with TanStack's streamed HTML and SDK responses. */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set(
    'Content-Security-Policy',
    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  )
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    )
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
