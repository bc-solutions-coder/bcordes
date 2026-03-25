import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockWallowClient } from '@/test/mocks/wallow'
import {
  createMockWallowClient,
  jsonResponse,
  textResponse,
} from '@/test/mocks/wallow'

// Mock @tanstack/react-start so createServerFn chains resolve to the handler
vi.mock('@tanstack/react-start', () => {
  const createServerFn = () => {
    let handlerFn: (...args: Array<unknown>) => unknown
    const chain = {
      inputValidator: () => chain,
      handler: (fn: (...args: Array<unknown>) => unknown) => {
        handlerFn = fn
        return (...args: Array<unknown>) => handlerFn(...args)
      },
    }
    return chain
  }
  return { createServerFn }
})

// Mock wallow client
let mockClient: MockWallowClient
vi.mock('@/lib/wallow/client', () => ({
  createWallowClient: vi.fn(() => Promise.resolve(mockClient)),
}))

// Import after mocks are set up
const {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  fetchNotificationSettings,
  updateChannelSetting,
  registerPushDevice,
  deregisterPushDevice,
  listPushDevices,
  fetchVapidPublicKey,
  sendTestPush,
} = await import('./notifications')

describe('notifications server functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockWallowClient()
  })

  // -------------------------------------------------------------------------
  // fetchNotifications
  // -------------------------------------------------------------------------
  describe('fetchNotifications', () => {
    it('calls client.get with pagination URL and returns items', async () => {
      const items = [
        {
          id: 'n-1',
          userId: 'u-1',
          type: 'info',
          title: 'Hello',
          message: 'World',
          isRead: false,
          readAt: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ]
      mockClient.get.mockResolvedValue(
        jsonResponse({
          items,
          pageNumber: 1,
          pageSize: 20,
          totalCount: 1,
        }),
      )

      const result = await fetchNotifications()

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/notifications?pageNumber=1&pageSize=20',
      )
      expect(result).toEqual(items)
    })
  })

  // -------------------------------------------------------------------------
  // fetchUnreadCount
  // -------------------------------------------------------------------------
  describe('fetchUnreadCount', () => {
    it('extracts count from object response', async () => {
      mockClient.get.mockResolvedValue(jsonResponse({ count: 5 }))

      const result = await fetchUnreadCount()

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/notifications/unread-count',
      )
      expect(result).toBe(5)
    })

    it('handles plain number response', async () => {
      mockClient.get.mockResolvedValue(jsonResponse(3))

      const result = await fetchUnreadCount()

      expect(result).toBe(3)
    })
  })

  // -------------------------------------------------------------------------
  // markNotificationRead
  // -------------------------------------------------------------------------
  describe('markNotificationRead', () => {
    it('calls client.post with correct path', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000'
      mockClient.post.mockResolvedValue(jsonResponse({}))

      await markNotificationRead({ data: { id } })

      expect(mockClient.post).toHaveBeenCalledWith(
        `/api/v1/notifications/${id}/read`,
      )
    })
  })

  // -------------------------------------------------------------------------
  // markAllNotificationsRead
  // -------------------------------------------------------------------------
  describe('markAllNotificationsRead', () => {
    it('calls client.post with correct path', async () => {
      mockClient.post.mockResolvedValue(jsonResponse({}))

      await markAllNotificationsRead()

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/notifications/read-all',
      )
    })
  })

  // -------------------------------------------------------------------------
  // fetchNotificationSettings
  // -------------------------------------------------------------------------
  describe('fetchNotificationSettings', () => {
    it('returns full settings array', async () => {
      const settings = [
        { channelType: 'email', isEnabled: true },
        { channelType: 'push', isEnabled: false },
      ]
      mockClient.get.mockResolvedValue(jsonResponse(settings))

      const result = await fetchNotificationSettings()

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/notification-settings',
      )
      expect(result).toEqual(settings)
    })
  })

  // -------------------------------------------------------------------------
  // updateChannelSetting
  // -------------------------------------------------------------------------
  describe('updateChannelSetting', () => {
    it('calls client.put with settings object', async () => {
      mockClient.put.mockResolvedValue(jsonResponse({}))

      await updateChannelSetting({
        data: { channelType: 'email', isEnabled: false },
      })

      expect(mockClient.put).toHaveBeenCalledWith(
        '/api/v1/notification-settings/channel',
        { channelType: 'email', isEnabled: false },
      )
    })
  })

  // -------------------------------------------------------------------------
  // registerPushDevice
  // -------------------------------------------------------------------------
  describe('registerPushDevice', () => {
    it('calls correct endpoint and returns device', async () => {
      const device = {
        id: 'dev-1',
        platform: 'web',
        createdAt: '2026-01-01T00:00:00Z',
      }
      const input = {
        endpoint: 'https://push.example.com/sub/123',
        p256dh: 'some-key',
        auth: 'some-auth',
      }
      mockClient.post.mockResolvedValue(jsonResponse(device))

      const result = await registerPushDevice({ data: input })

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/push/devices',
        input,
      )
      expect(result).toEqual(device)
    })
  })

  // -------------------------------------------------------------------------
  // deregisterPushDevice
  // -------------------------------------------------------------------------
  describe('deregisterPushDevice', () => {
    it('calls delete with correct endpoint', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000'
      mockClient.delete.mockResolvedValue(jsonResponse({}))

      await deregisterPushDevice({ data: { id } })

      expect(mockClient.delete).toHaveBeenCalledWith(
        `/api/v1/push/devices/${id}`,
      )
    })
  })

  // -------------------------------------------------------------------------
  // listPushDevices
  // -------------------------------------------------------------------------
  describe('listPushDevices', () => {
    it('returns device array', async () => {
      const devices = [
        { id: 'dev-1', platform: 'web', createdAt: '2026-01-01T00:00:00Z' },
        {
          id: 'dev-2',
          platform: 'android',
          createdAt: '2026-01-02T00:00:00Z',
        },
      ]
      mockClient.get.mockResolvedValue(jsonResponse(devices))

      const result = await listPushDevices()

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/push/devices')
      expect(result).toEqual(devices)
    })
  })

  // -------------------------------------------------------------------------
  // fetchVapidPublicKey
  // -------------------------------------------------------------------------
  describe('fetchVapidPublicKey', () => {
    it('calls correct API path and returns text', async () => {
      mockClient.get.mockResolvedValue(textResponse('BPub...key'))

      const result = await fetchVapidPublicKey()

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/push/vapid-public-key',
      )
      expect(result).toBe('BPub...key')
    })
  })

  // -------------------------------------------------------------------------
  // sendTestPush
  // -------------------------------------------------------------------------
  describe('sendTestPush', () => {
    it('calls correct API path', async () => {
      mockClient.post.mockResolvedValue(jsonResponse({}))

      await sendTestPush()

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/push/send')
    })
  })
})
