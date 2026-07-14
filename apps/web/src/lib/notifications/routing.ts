import type { Notification } from '@/lib/wallow/types'

const FALLBACK = '/dashboard/notifications'
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isSafeRelativeUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://')
}

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function getNotificationRoute(notification: Notification): string {
  if (notification.actionUrl && isSafeRelativeUrl(notification.actionUrl))
    return notification.actionUrl

  const { type, entityId } = notification
  const safeEntityId = entityId && isValidUuid(entityId) ? entityId : undefined

  switch (type) {
    case 'TaskAssigned':
    case 'TaskCompleted':
    case 'TaskComment':
      return safeEntityId ? `/dashboard/tasks/${safeEntityId}` : FALLBACK

    case 'InquirySubmitted':
    case 'InquiryStatusChanged':
    case 'InquiryComment':
      return safeEntityId ? `/dashboard/inquiries/${safeEntityId}` : FALLBACK

    case 'BillingInvoice':
      return '/dashboard/billing'

    default:
      return FALLBACK
  }
}
