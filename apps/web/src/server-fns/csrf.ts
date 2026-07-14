import { createServerFn } from '@tanstack/react-start'
import { getSession } from '@/lib/auth/session'

export const getCsrfToken = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getSession()
    if (!session?.csrfToken) {
      return { token: null }
    }
    return { token: session.csrfToken }
  },
)
