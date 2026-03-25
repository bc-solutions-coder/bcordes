import { describe, expect, it } from 'vitest'
import { getNotificationRoute } from '@/lib/notifications/routing'
import type { Notification } from '@/lib/wallow/types'

const FALLBACK = '/dashboard/notifications'
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

function makeNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002',
    type: 'InquirySubmitted',
    title: 'Test',
    message: 'Test notification',
    isRead: false,
    readAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getNotificationRoute', () => {
  describe('actionUrl takes priority', () => {
    it('returns actionUrl verbatim when present, regardless of type', () => {
      const types = [
        'TaskAssigned',
        'InquirySubmitted',
        'BillingInvoice',
        'SomeUnknownType',
      ]
      for (const type of types) {
        const notification = makeNotification({
          type,
          entityId: VALID_UUID,
          actionUrl: '/custom/path',
        })
        expect(getNotificationRoute(notification)).toBe('/custom/path')
      }
    })
  })

  describe('task types route to /dashboard/tasks/:entityId', () => {
    it.each(['TaskAssigned', 'TaskCompleted', 'TaskComment'])(
      '%s with entityId produces /dashboard/tasks/:entityId',
      (type) => {
        const notification = makeNotification({ type, entityId: VALID_UUID })
        expect(getNotificationRoute(notification)).toBe(
          `/dashboard/tasks/${VALID_UUID}`,
        )
      },
    )
  })

  describe('inquiry types route to /dashboard/inquiries/:entityId', () => {
    it.each(['InquirySubmitted', 'InquiryStatusChanged', 'InquiryComment'])(
      '%s with entityId produces /dashboard/inquiries/:entityId',
      (type) => {
        const notification = makeNotification({ type, entityId: VALID_UUID })
        expect(getNotificationRoute(notification)).toBe(
          `/dashboard/inquiries/${VALID_UUID}`,
        )
      },
    )
  })

  describe('billing type', () => {
    it('BillingInvoice produces /dashboard/billing', () => {
      const notification = makeNotification({ type: 'BillingInvoice' })
      expect(getNotificationRoute(notification)).toBe('/dashboard/billing')
    })
  })

  describe('unknown type falls back', () => {
    it('returns /dashboard/notifications for an unrecognized type', () => {
      const notification = makeNotification({
        type: 'CompletelyUnknownType',
        entityId: VALID_UUID,
      })
      expect(getNotificationRoute(notification)).toBe(FALLBACK)
    })
  })

  describe('missing entityId falls back', () => {
    it.each(['TaskAssigned', 'TaskCompleted', 'TaskComment'])(
      '%s without entityId falls back to /dashboard/notifications',
      (type) => {
        const notification = makeNotification({
          type,
          entityId: undefined,
        })
        expect(getNotificationRoute(notification)).toBe(FALLBACK)
      },
    )

    it.each(['InquirySubmitted', 'InquiryStatusChanged', 'InquiryComment'])(
      '%s without entityId falls back to /dashboard/notifications',
      (type) => {
        const notification = makeNotification({
          type,
          entityId: undefined,
        })
        expect(getNotificationRoute(notification)).toBe(FALLBACK)
      },
    )
  })
})
