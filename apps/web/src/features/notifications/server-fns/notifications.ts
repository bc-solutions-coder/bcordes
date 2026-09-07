import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  notificationsGetNotifications,
  notificationsGetUnreadCount,
  notificationsMarkAllAsRead,
  notificationsMarkAsRead,
  userNotificationSettingsGetUserNotificationSettings,
  userNotificationSettingsSetChannelEnabled,
} from '@bc-solutions-coder/sdk'
import { requireAuth } from '@bcordes/auth/middleware'
import { createWallowClient } from '@bcordes/wallow/client'
import type { PushDevice } from '@bcordes/wallow/types'

async function authenticatedClient() {
  await requireAuth()
  return (await createWallowClient()).client
}

export const fetchNotifications = createServerFn({ method: 'GET' }).handler(
  async () => {
    const response = await notificationsGetNotifications({
      client: await authenticatedClient(),
      query: { pageNumber: 1, pageSize: 20 },
    })
    return response.items
  },
)

export const fetchUnreadCount = createServerFn({ method: 'GET' }).handler(
  async () => {
    const response = await notificationsGetUnreadCount({
      client: await authenticatedClient(),
    })
    return Number(response.count)
  },
)

export const markNotificationRead = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await notificationsMarkAsRead({
      client: await authenticatedClient(),
      path: { id: data.id },
    })
  })

export const markAllNotificationsRead = createServerFn({
  method: 'POST',
}).handler(async () => {
  await notificationsMarkAllAsRead({ client: await authenticatedClient() })
})

export const fetchNotificationSettings = createServerFn({
  method: 'GET',
}).handler(async () => {
  const response = await userNotificationSettingsGetUserNotificationSettings({
    client: await authenticatedClient(),
  })
  return response.channelSettings.map((channel) => ({
    channelType: channel.channelType,
    isEnabled: channel.isGloballyEnabled,
  }))
})

export const updateChannelSetting = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({ channelType: z.number().int(), isEnabled: z.boolean() }),
  )
  .handler(async ({ data }) => {
    await userNotificationSettingsSetChannelEnabled({
      client: await authenticatedClient(),
      body: data,
    })
  })

async function pendingPushContract(): Promise<never> {
  await requireAuth()
  throw new Error(
    'Browser push is awaiting the Wallow delivery and device authorization update.',
  )
}

export const registerPushDevice = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      endpoint: z.url().max(2048),
      p256dh: z.string().max(256),
      auth: z.string().max(128),
    }),
  )
  .handler(async (): Promise<PushDevice> => pendingPushContract())
export const deregisterPushDevice = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async (): Promise<void> => pendingPushContract())
export const listPushDevices = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<PushDevice>> => pendingPushContract(),
)
export const fetchVapidPublicKey = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string> => pendingPushContract(),
)
export const sendTestPush = createServerFn({ method: 'POST' }).handler(
  async (): Promise<void> => pendingPushContract(),
)
