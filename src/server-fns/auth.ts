import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthUser, requireAuth } from '@/lib/auth/middleware'

export const serverRequireAuth = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ returnTo: z.string().optional() }))
  .handler(async ({ data }) => {
    await requireAuth(data.returnTo)
  })

export const fetchCurrentUserRoles = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getAuthUser()
    return { roles: user?.roles ?? [] }
  },
)
