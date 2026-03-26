import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  Notification,
  NotificationSettings,
  PaginatedResponse,
  PushDevice,
} from '~/lib/wallow/types'
import { createWallowClient } from '~/lib/wallow/client'

export const fetchNotifications = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get(
      '/api/v1/notifications?pageNumber=1&pageSize=20',
    )
    const paginated = (await response.json()) as PaginatedResponse<Notification>
    return paginated.items
  },
)

export const fetchUnreadCount = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get('/api/v1/notifications/unread-count')
    const data = (await response.json()) as { count: number } | number
    return typeof data === 'number' ? data : data.count
  },
)

export const markNotificationRead = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    await client.post(`/api/v1/notifications/${data.id}/read`)
  })

export const markAllNotificationsRead = createServerFn({
  method: 'POST',
}).handler(async () => {
  const client = await createWallowClient()
  await client.post('/api/v1/notifications/read-all')
})

export const fetchNotificationSettings = createServerFn({
  method: 'GET',
}).handler(async () => {
  const client = await createWallowClient()
  const response = await client.get('/api/v1/notification-settings')
  return (await response.json()) as Array<NotificationSettings>
})

const updateChannelSettingSchema = z.object({
  channelType: z.string(),
  isEnabled: z.boolean(),
})

export const updateChannelSetting = createServerFn({ method: 'POST' })
  .inputValidator(updateChannelSettingSchema)
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    await client.put('/api/v1/notification-settings/channel', data)
  })

const registerPushDeviceSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().max(256),
  auth: z.string().max(128),
})

export const registerPushDevice = createServerFn({ method: 'POST' })
  .inputValidator(registerPushDeviceSchema)
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    const response = await client.post('/api/v1/push/devices', data)
    return (await response.json()) as PushDevice
  })

export const deregisterPushDevice = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    await client.delete(`/api/v1/push/devices/${data.id}`)
  })

export const listPushDevices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get('/api/v1/push/devices')
    return (await response.json()) as Array<PushDevice>
  },
)

export const fetchVapidPublicKey = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get('/api/v1/push/vapid-public-key')
    return await response.text()
  },
)

export const sendTestPush = createServerFn({ method: 'POST' }).handler(
  async () => {
    const client = await createWallowClient()
    await client.post('/api/v1/push/send')
  },
)
