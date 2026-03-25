import { defineEventHandler, setHeaders } from 'h3'

/**
 * Security response headers middleware.
 * Sets standard security headers on every response.
 */
export default defineEventHandler((event) => {
  setHeaders(event, {
    'Content-Security-Policy':
      "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
})
