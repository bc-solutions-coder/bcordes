import { createFileRoute } from '@tanstack/react-router'
import { getAuthUser } from '@/lib/auth/middleware'
import logger from '@/lib/logger'

const log = logger.child({ module: 'auth.me' })

export const Route = createFileRoute('/auth/me')({
  server: {
    handlers: {
      GET: async () => {
        const user = await getAuthUser()
        log.debug({ authenticated: !!user }, 'auth check')
        return Response.json(user ?? null, { status: 200 })
      },
    },
  },
})
