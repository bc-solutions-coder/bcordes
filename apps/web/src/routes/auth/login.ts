import { createFileRoute } from '@tanstack/react-router'
import {
  getAuthorizationUrl,
  randomPKCECodeVerifier,
  randomState,
} from '@/lib/auth/oidc'
import { redact } from '@/lib/auth/redact'
import logger from '@/lib/logger'

const log = logger.child({ module: 'auth.login' })

const MAX_LOGIN_ATTEMPTS = 3

function getLoginAttempts(cookieHeader: string): number {
  const match = cookieHeader.match(/__oauth_attempts=(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

export const Route = createFileRoute('/auth/login')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url)
        const returnTo = url.searchParams.get('returnTo')
        const cookieHeader = request.headers.get('cookie') ?? ''
        const attempts = getLoginAttempts(cookieHeader)

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          log.warn(
            { attempts },
            'too many login attempts, breaking redirect loop',
          )
          const headers = new Headers({
            Location: '/auth/error?reason=too_many_redirects',
          })
          // Reset the counter so the user can try again from the error page
          headers.append(
            'Set-Cookie',
            '__oauth_attempts=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
          )
          return new Response(null, { status: 302, headers })
        }

        const state = randomState()
        const codeVerifier = randomPKCECodeVerifier()
        const authorizationURL = await getAuthorizationUrl(state, codeVerifier)

        log.info(
          { returnTo, state: redact(state), attempt: attempts + 1 },
          'login initiated, redirecting to OIDC provider',
        )

        const cookieOptions = [
          'HttpOnly',
          'Path=/',
          'Max-Age=600',
          'SameSite=Lax',
          ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
        ].join('; ')

        const headers = new Headers({
          Location: authorizationURL,
        })
        headers.append('Set-Cookie', `__oauth_state=${state}; ${cookieOptions}`)
        headers.append(
          'Set-Cookie',
          `__oauth_code_verifier=${codeVerifier}; ${cookieOptions}`,
        )
        headers.append(
          'Set-Cookie',
          `__oauth_attempts=${attempts + 1}; ${cookieOptions}`,
        )
        if (returnTo) {
          headers.append(
            'Set-Cookie',
            `__oauth_return_to=${encodeURIComponent(returnTo)}; ${cookieOptions}`,
          )
        }

        return new Response(null, { status: 302, headers })
      },
    },
  },
})
