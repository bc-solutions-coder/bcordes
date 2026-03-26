import type { Notification } from '@/lib/wallow/types'

const FALLBACK = '/dashboard/notifications'

export function getNotificationRoute(notification: Notification): string {
  const { type, entityId } = notification

  switch (type) {
    case 'TaskAssigned':
    case 'TaskCompleted':
    case 'TaskComment':
      return entityId ? `/dashboard/tasks/${entityId}` : FALLBACK

    case 'InquirySubmitted':
    case 'InquiryStatusChanged':
      return entityId ? `/dashboard/inquiries/${entityId}` : FALLBACK

    case 'BillingInvoice':
      return '/dashboard/billing'

    default:
      return FALLBACK
  }
}
