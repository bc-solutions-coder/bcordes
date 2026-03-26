import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/middleware'

export const serverRequireAuth = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ returnTo: z.string().optional() }))
  .handler(async ({ data }) => {
    await requireAuth(data.returnTo)
  })
