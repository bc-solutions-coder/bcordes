import { createFileRoute } from '@tanstack/react-router'
import { clearSession, getSession } from '@/lib/auth/session'
import { getLogoutUrl } from '@/lib/auth/oidc'

async function handleLogout(request: Request) {
  const session = await getSession()
  const idTokenHint = session?.idToken

  // Clear local session cookie and server-side store
  clearSession()

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
