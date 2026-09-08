import { ZodError } from 'zod'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWallowSdk } from '@bc-solutions-coder/sdk'
import { createMockUser } from '@bcordes/auth/testing'
import { requireAuth } from '@bcordes/auth/middleware'
import { createWallowClient } from '@bcordes/wallow/client'
import {
  deregisterPushDevice,
  markNotificationRead,
  registerPushDevice,
} from './notifications'

vi.mock(
  '@tanstack/react-start',
  () => import('../../../../testing/server-functions'),
)
vi.mock('@bcordes/auth/middleware', () => ({ requireAuth: vi.fn() }))
vi.mock('@bcordes/wallow/client', () => ({ createWallowClient: vi.fn() }))
const send = vi.fn<typeof fetch>()
const id = '550e8400-e29b-41d4-a716-446655440000'
const subscription = {
  endpoint: 'https://push.example/subscription',
  p256dh: 'abc',
  auth: 'xyz',
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(createMockUser())
  vi.mocked(createWallowClient).mockResolvedValue(
    createWallowSdk({ baseUrl: 'https://fixture.example', fetch: send }),
  )
  send.mockResolvedValue(new Response(null, { status: 204 }))
})

describe('Registered notification UUID validation', () => {
  it.each([
    { name: 'markNotificationRead', operation: markNotificationRead },
    { name: 'deregisterPushDevice', operation: deregisterPushDevice },
  ])(
    'rejects malformed UUIDs for $name before authentication or traffic',
    async ({ operation }) => {
      await expect(
        operation({ data: { id: 'not-a-uuid' } }),
      ).rejects.toBeInstanceOf(ZodError)
      expect(requireAuth).not.toHaveBeenCalled()
      expect(send).not.toHaveBeenCalled()
    },
  )
  it('marks the authorized notification UUID as read', async () => {
    await markNotificationRead({ data: { id } })
    expect(send).toHaveBeenCalledOnce()
    const request = send.mock.calls[0]?.[0]
    if (!(request instanceof Request))
      throw new Error('Notification request missing')
    expect(request.method).toBe('POST')
    expect(request.url).toBe(
      `https://fixture.example/v1/notifications/${id}/read`,
    )
  })
  it('rejects a signed-out read before sending traffic', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new Response('Unauthorized', { status: 401 }),
    )
    await expect(markNotificationRead({ data: { id } })).rejects.toMatchObject({
      status: 401,
    })
    expect(send).not.toHaveBeenCalled()
  })
  it('reaches the authenticated unavailable contract for a valid device UUID', async () => {
    await expect(deregisterPushDevice({ data: { id } })).rejects.toThrow(
      'Browser push is awaiting the Wallow delivery and device authorization update.',
    )
    expect(requireAuth).toHaveBeenCalledOnce()
    expect(send).not.toHaveBeenCalled()
  })
})

describe('Registered browser push validation', () => {
  it.each([
    ['endpoint', 'not-a-url'],
    ['endpoint', 'https://example.com/' + 'a'.repeat(2048)],
    ['p256dh', 'x'.repeat(257)],
    ['auth', 'x'.repeat(129)],
  ])(
    'rejects invalid %s before authentication or traffic',
    async (field, value) => {
      await expect(
        registerPushDevice({ data: { ...subscription, [field]: value } }),
      ).rejects.toBeInstanceOf(ZodError)
      expect(requireAuth).not.toHaveBeenCalled()
      expect(send).not.toHaveBeenCalled()
    },
  )
  it.each([
    {
      name: 'HTTPS endpoint',
      fields: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123' },
    },
    { name: 'HTTP endpoint', fields: { endpoint: 'http://example.com/push' } },
    {
      name: '2048-character endpoint',
      fields: { endpoint: 'https://example.com/' + 'a'.repeat(2028) },
    },
    { name: '256-character key', fields: { p256dh: 'x'.repeat(256) } },
    { name: '128-character auth', fields: { auth: 'x'.repeat(128) } },
  ])(
    'validates $name and reaches the authenticated unavailable contract',
    async ({ fields }) => {
      await expect(
        registerPushDevice({ data: { ...subscription, ...fields } }),
      ).rejects.toThrow(
        'Browser push is awaiting the Wallow delivery and device authorization update.',
      )
      expect(requireAuth).toHaveBeenCalledOnce()
      expect(send).not.toHaveBeenCalled()
    },
  )
  it.each([
    {
      name: 'registration',
      operation: () => registerPushDevice({ data: subscription }),
    },
    {
      name: 'deregistration',
      operation: () => deregisterPushDevice({ data: { id } }),
    },
  ])(
    'requires sign-in for valid $name input before the unavailable contract',
    async ({ operation }) => {
      vi.mocked(requireAuth).mockRejectedValue(
        new Response('Unauthorized', { status: 401 }),
      )
      await expect(operation()).rejects.toMatchObject({ status: 401 })
      expect(send).not.toHaveBeenCalled()
    },
  )
})
