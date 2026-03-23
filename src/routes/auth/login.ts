import { createFileRoute } from '@tanstack/react-router'
import {
  getAuthorizationUrl,
  randomPKCECodeVerifier,
  randomState,
} from '~/lib/auth/oidc'

export const Route = createFileRoute('/auth/login')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url)
        const returnTo = url.searchParams.get('returnTo')

        const state = randomState()
        const codeVerifier = randomPKCECodeVerifier()
        const authorizationURL = await getAuthorizationUrl(state, codeVerifier)

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
