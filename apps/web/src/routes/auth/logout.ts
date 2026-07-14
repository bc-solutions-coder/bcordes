import { createFileRoute } from '@tanstack/react-router'
import { clearSession, getSession } from '@/lib/auth/session'
import { getLogoutUrl } from '@/lib/auth/oidc'
import logger from '@/lib/logger'

const log = logger.child({ module: 'auth.logout' })

async function handleLogout(request: Request) {
  const session = await getSession()
  const idTokenHint = session?.idToken

  log.info(
    { hasSession: !!session, hasIdToken: !!idTokenHint },
    'logout initiated',
  )

  // Clear local session cookie and server-side store
  clearSession()

  log.info('session cleared, redirecting to OIDC logout')

  // Build the post-logout redirect back to the site root
  const origin = new URL(request.url).origin
  const logoutUrl = await getLogoutUrl(idTokenHint, `${origin}/`)

  return new Response(null, {
    status: 302,
    headers: { Location: logoutUrl },
  })
}

export const Route = createFileRoute('/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => handleLogout(request),
    },
  },
})
