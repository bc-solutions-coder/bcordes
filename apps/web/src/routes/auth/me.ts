import { createFileRoute } from '@tanstack/react-router'
import logger from '@bcordes/logger'
import { getAuthUser } from '@/lib/auth/middleware'

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
