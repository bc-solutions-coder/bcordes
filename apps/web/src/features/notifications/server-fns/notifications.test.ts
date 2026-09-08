import { beforeEach, expect, it, vi } from 'vitest'
import { createWallowSdk } from '@bc-solutions-coder/sdk'
import { requireAuth } from '@bcordes/auth/middleware'
import { createMockUser } from '@bcordes/auth/testing'
import { createWallowClient } from '@bcordes/wallow/client'
import {
  fetchNotificationSettings,
  fetchNotifications,
  fetchUnreadCount,
} from './notifications'

vi.mock(
  '@tanstack/react-start',
  () => import('../../../../testing/server-functions'),
)
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
      channelSettings: [
        { channelType: 0, isGloballyEnabled: true },
        { channelType: 1, isGloballyEnabled: false },
      ],
    }),
  )
  expect(await fetchNotificationSettings()).toEqual([
    { channelType: 0, isEnabled: true },
    { channelType: 1, isEnabled: false },
  ])
})
it('returns a numeric unread count from the published string count', async () => {
  send.mockResolvedValue(Response.json({ count: '4' }))
  expect(await fetchUnreadCount()).toBe(4)
})
it('requests the first 20 notifications and preserves the returned entries and order', async () => {
  const items = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Earlier result',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Later result',
      createdAt: '2026-03-01T00:00:00Z',
    },
  ]
  send.mockResolvedValue(Response.json({ items, totalCount: 80 }))
  expect(await fetchNotifications()).toEqual(items)
  const request = send.mock.calls[0]?.[0]
  if (!(request instanceof Request))
    throw new Error('Missing notifications request')
  expect(request.method).toBe('GET')
  const url = new URL(request.url)
  expect(url.pathname).toBe('/api/v1/notifications')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    pageNumber: '1',
    pageSize: '20',
  })
})
