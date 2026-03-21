import { createServerFn } from '@tanstack/react-start'
import { createWallowClient } from '~/lib/wallow/client'
import type { Notification } from '~/lib/wallow/types'

export const fetchNotifications = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get('/api/communications/notifications')
    return (await response.json()) as Notification[]
  },
)
