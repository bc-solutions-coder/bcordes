import { describe, expect, it } from 'vitest'
import type { Notification } from '@bcordes/wallow/types'
import { getNotificationRoute } from '@/features/notifications'

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002',
    type: 'InquirySubmitted',
    title: 'Test',
    message: 'Test notification',
    isRead: false,
    readAt: null,
    actionUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const FALLBACK = '/dashboard/notifications'
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('getNotificationRoute — URL validation', () => {
  it('rejects absolute http:// actionUrl and uses the inquiry destination', () => {
    const notification = makeNotification({
      type: 'InquirySubmitted',
      actionUrl: 'http://evil.com/steal-cookies',
      entityId: VALID_UUID,
    })
    const route = getNotificationRoute(notification)
    expect(route).toBe(`/dashboard/inquiries/${VALID_UUID}`)
  })

  it('rejects protocol-relative //evil.com actionUrl and uses the task destination', () => {
    const notification = makeNotification({
      type: 'TaskAssigned',
      actionUrl: '//evil.com/payload',
      entityId: VALID_UUID,
    })
    const route = getNotificationRoute(notification)
    expect(route).toBe(`/dashboard/tasks/${VALID_UUID}`)
  })

  it('rejects javascript: actionUrl and uses the task destination', () => {
    const notification = makeNotification({
      type: 'TaskComment',
      actionUrl: 'javascript:alert(1)',
      entityId: VALID_UUID,
    })
    const route = getNotificationRoute(notification)
    expect(route).toBe(`/dashboard/tasks/${VALID_UUID}`)
  })
})

describe('getNotificationRoute — entityId validation', () => {
  it('returns fallback when entityId is a non-UUID string', () => {
    const notification = makeNotification({
      type: 'InquirySubmitted',
      entityId: '../../../etc/passwd',
    })
    const route = getNotificationRoute(notification)
    expect(route).toBe(FALLBACK)
  })
})
