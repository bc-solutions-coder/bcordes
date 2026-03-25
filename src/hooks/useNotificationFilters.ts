import { useCallback, useMemo, useState } from 'react'
import type { Notification } from '@/lib/wallow/types'

const notificationTypes = [
  'TaskAssigned',
  'InquirySubmitted',
  'InquiryComment',
  'SystemAlert',
  'Announcement',
  'BillingInvoice',
  'Mention',
] as const

export type NotificationType = (typeof notificationTypes)[number]

export { notificationTypes }

export function useNotificationFilters(notifications: Array<Notification>) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [activeType, setActiveType] = useState<NotificationType | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = notifications
    if (unreadOnly) result = result.filter((n) => !n.isRead)
    if (activeType) result = result.filter((n) => n.type === activeType)
    return result
  }, [notifications, unreadOnly, activeType])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  )

  const handleTabChange = useCallback((value: string) => {
    setUnreadOnly(value === 'unread')
    setPage(1)
  }, [])

  const handleTypeFilter = useCallback((type: NotificationType) => {
    setActiveType((prev) => (prev === type ? null : type))
    setPage(1)
  }, [])

  return {
    unreadOnly,
    activeType,
    page,
    setPage,
    filtered,
    unreadCount,
    handleTabChange,
    handleTypeFilter,
  }
}
