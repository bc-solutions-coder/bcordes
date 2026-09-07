import { beforeEach, expect, it, vi } from 'vitest'
import { createWallowSdk } from '@bc-solutions-coder/sdk'
import { requireAuth } from '@bcordes/auth/middleware'
import { createMockUser } from '@bcordes/auth/testing'
import { createWallowClient } from '@bcordes/wallow/client'
import {
  fetchNotificationSettings,
  fetchUnreadCount,
  registerPushDevice,
} from './notifications'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = {
      inputValidator: () => builder,
      handler: (fn: unknown) => fn,
    }
    return builder
  },
}))
vi.mock('@bcordes/auth/middleware', () => ({ requireAuth: vi.fn() }))
vi.mock('@bcordes/wallow/client', () => ({ createWallowClient: vi.fn() }))
const send = vi.fn<typeof fetch>()
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(createMockUser())
  vi.mocked(createWallowClient).mockResolvedValue(
    createWallowSdk({ baseUrl: 'https://app.example/api', fetch: send }),
  )
})
it('unwraps the published channel settings response', async () => {
  send.mockResolvedValue(
    Response.json({
      userId: 'user',
      channelSettings: [{ channelType: 0, isGloballyEnabled: true }],
    }),
  )
  expect(await fetchNotificationSettings()).toEqual([
    { channelType: 0, isEnabled: true },
  ])
})
it('normalizes string counts', async () => {
  send.mockResolvedValue(Response.json({ count: '4' }))
  expect(await fetchUnreadCount()).toBe(4)
})
it('does not send unsupported push subscriptions to the platform', async () => {
  await expect(
    registerPushDevice({
      data: { endpoint: 'https://push.example', p256dh: 'key', auth: 'auth' },
    }),
  ).rejects.toThrow('awaiting the Wallow')
  expect(send).not.toHaveBeenCalled()
})
