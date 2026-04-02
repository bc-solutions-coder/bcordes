import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import type { SessionData } from '@/lib/auth/types'
import {
  exchangeCode,
  fetchUserProfile,
  parseUserFromToken,
} from '@/lib/auth/oidc'
import { redact, redactUser } from '@/lib/auth/redact'
import { sealSessionCookie } from '@/lib/auth/session'
import logger from '@/lib/logger'

const log = logger.child({ module: 'auth.callback' })

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]),
  )
}

function clearTempCookies(): Array<string> {
  const expired = 'Max-Age=0; Path=/; HttpOnly; SameSite=Lax'
  return [
    `__oauth_state=; ${expired}`,
    `__oauth_code_verifier=; ${expired}`,
    `__oauth_return_to=; ${expired}`,
  ]
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function isSameOrigin(returnTo: string, requestUrl: string): boolean {
  try {
    const origin = new URL(requestUrl).origin
    const target = new URL(returnTo, origin)
    return target.origin === origin
  } catch {
    return false
  }
}

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        log.info('callback received from OIDC provider')

        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')

        const cookies = parseCookies(request.headers.get('cookie') ?? '')
        const storedState = cookies['__oauth_state']
        const codeVerifier = cookies['__oauth_code_verifier']
        const rawReturnTo = cookies['__oauth_return_to']

        const clearHeaders = clearTempCookies()

        const errorRedirect = (reason: string) => {
          log.warn({ reason }, 'callback error, redirecting to login')
          const headers = new Headers({
            Location: `/auth/login?error=${encodeURIComponent(reason)}`,
          })
          for (const c of clearHeaders) headers.append('Set-Cookie', c)
          return new Response(null, { status: 302, headers })
        }

        if (!code || !state || !storedState || !codeVerifier) {
          return errorRedirect('missing_params')
        }
        if (!safeEqual(state, storedState)) {
          return errorRedirect('state_mismatch')
        }

        try {
          const tokens = await exchangeCode(
            code,
            codeVerifier,
            request.url,
            state,
          )
          const tokenUser = parseUserFromToken(tokens.accessToken)
          const profileUser = await fetchUserProfile(
            tokens.accessToken,
            tokens.subject,
          )
          // Merge: userinfo for profile fields, access token for org claims
          const user = {
            ...profileUser,
            tenantId: profileUser.tenantId || tokenUser.tenantId,
            tenantName: profileUser.tenantName || tokenUser.tenantName,
            roles: profileUser.roles.length
              ? profileUser.roles
              : tokenUser.roles,
          }
          // Default to 1 hour if the provider doesn't return expires_in
          const expiresAt =
            Math.floor(Date.now() / 1000) + (tokens.expiresIn || 3600)

          const sessionData: SessionData = {
            sessionId: crypto.randomUUID(),
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            idToken: tokens.idToken,
            expiresAt,
            user,
            version: 1,
            csrfToken: randomBytes(32).toString('hex'),
          }

          log.info(
            {
              user: redactUser(user),
              sessionId: redact(sessionData.sessionId),
            },
            'session created, redirecting to app',
          )

          const sessionCookie = await sealSessionCookie(sessionData)

          let destination = '/'
          if (rawReturnTo && isSameOrigin(rawReturnTo, request.url)) {
            destination = rawReturnTo
          }

          log.info({ destination }, 'callback complete, redirecting')

          const headers = new Headers({ Location: destination })
          headers.append('Set-Cookie', sessionCookie)
          for (const c of clearHeaders) headers.append('Set-Cookie', c)
          return new Response(null, { status: 302, headers })
        } catch (err) {
          log.error(
            { err: err instanceof Error ? err.message : String(err) },
            'token exchange failed',
          )
          return errorRedirect('auth_failed')
        }
      },
    },
  },
})
