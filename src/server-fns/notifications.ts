import { createServerFn } from '@tanstack/react-start'
import type { Notification } from '~/lib/wallow/types'
import { createWallowClient } from '~/lib/wallow/client'

export const fetchNotifications = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get('/api/communications/notifications')
    return (await response.json()) as Array<Notification>
  },
)
