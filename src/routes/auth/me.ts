import { createFileRoute } from '@tanstack/react-router'
import { getAuthUser } from '~/lib/auth/middleware'

export const Route = createFileRoute('/auth/me')({
  server: {
    handlers: {
      GET: async () => {
        const user = await getAuthUser()
        return Response.json(user ?? null, { status: 200 })
      },
    },
  },
})
