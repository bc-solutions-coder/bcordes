import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createWallowClient } from '~/lib/wallow/client'
import type { Notification } from '~/lib/wallow/types'

export const fetchNotifications = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get('/api/notifications')
    return (await response.json()) as Notification[]
  },
)

export const markNotificationRead = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    await client.patch(`/api/notifications/${data.id}/read`)
  })
