import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  Bell,
  CheckSquare,
  ClipboardList,
  CreditCard,
  Mail,
  Megaphone,
  MessageSquare,
  AlertTriangle,
  CheckCheck,
  Loader2,
} from 'lucide-react'
import { serverRequireAuth } from '@/server-fns/auth'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/server-fns/notifications'
import { getNotificationRoute } from '@/lib/notifications/routing'
import { useSignalR } from '@/hooks/useSignalR'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Notification } from '@/lib/wallow/types'

const notificationTypes = [
  'TaskAssigned',
  'InquirySubmitted',
  'SystemAlert',
  'Announcement',
  'BillingInvoice',
  'Mention',
] as const

type NotificationType = (typeof notificationTypes)[number]

const typeIcon: Record<NotificationType, typeof Bell> = {
  TaskAssigned: ClipboardList,
  InquirySubmitted: Mail,
  SystemAlert: AlertTriangle,
  Announcement: Megaphone,
  BillingInvoice: CreditCard,
  Mention: MessageSquare,
}

const typeLabels: Record<NotificationType, string> = {
  TaskAssigned: 'Tasks',
  InquirySubmitted: 'Inquiries',
  SystemAlert: 'Alerts',
  Announcement: 'Announcements',
  BillingInvoice: 'Billing',
  Mention: 'Mentions',
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const Route = createFileRoute('/dashboard/notifications/')({
  beforeLoad: () =>
    serverRequireAuth({ data: { returnTo: '/dashboard/notifications' } }),
  loader: async () => {
    const notifications = await fetchNotifications()
    return { notifications }
  },
  component: NotificationsIndexPage,
})

function NotificationsIndexPage() {
  const { notifications: initialNotifications } = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { subscribe } = useSignalR()

  const [unreadOnly, setUnreadOnly] = useState(false)
  const [activeType, setActiveType] = useState<NotificationType | null>(null)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const queryKey = useMemo(
    () => ['notifications', { page, type: activeType, unreadOnly }] as const,
    [page, activeType, unreadOnly],
  )

  const { data: notifications = initialNotifications } = useQuery({
    queryKey,
    queryFn: () => fetchNotifications(),
    initialData: page === 1 && !activeType && !unreadOnly
      ? initialNotifications
      : undefined,
  })

  // Subscribe to real-time notification events
  useEffect(() => {
    const unsubs = [
      subscribe('NotificationCreated', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      }),
    ]
    return () => unsubs.forEach((unsub) => unsub())
  }, [subscribe, queryClient])

  // Filter notifications client-side
  const filteredNotifications = useMemo(() => {
    let result = notifications
    if (unreadOnly) {
      result = result.filter((n) => !n.readAt)
    }
    if (activeType) {
      result = result.filter((n) => n.type === activeType)
    }
    return result
  }, [notifications, unreadOnly, activeType])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications],
  )

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleRowClick = useCallback(
    async (notification: Notification) => {
      if (!notification.readAt) {
        markReadMutation.mutate(notification.id)
      }
      const route = getNotificationRoute(notification)
      navigate({ to: route })
    },
    [markReadMutation, navigate],
  )

  const allSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedIds.has(n.id))

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  function handleTabChange(value: string) {
    setUnreadOnly(value === 'unread')
    setPage(1)
    setSelectedIds(new Set())
  }

  function handleTypeFilter(type: NotificationType) {
    setActiveType((prev) => (prev === type ? null : type))
    setPage(1)
    setSelectedIds(new Set())
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="border-b border-border-default bg-background-secondary">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-accent-secondary" />
            <h1 className="text-xl font-semibold text-text-primary">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Tabs */}
        <Tabs
          value={unreadOnly ? 'unread' : 'all'}
          onValueChange={handleTabChange}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {notificationTypes.map((type) => (
            <Button
              key={type}
              variant={activeType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeFilter(type)}
              className={
                activeType === type
                  ? ''
                  : 'border-border-default text-text-secondary hover:text-text-primary hover:bg-background-primary'
              }
            >
              {typeLabels[type]}
            </Button>
          ))}
        </div>

        {/* Bulk actions toolbar */}
        {filteredNotifications.length > 0 && (
          <div className="mb-4 flex items-center gap-4 rounded-lg border border-border-default bg-background-secondary px-4 py-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => handleSelectAll(!!checked)}
              aria-label="Select all notifications"
            />
            <span className="text-sm text-text-secondary">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : 'Select all'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
              className="ml-auto border-border-default text-text-secondary hover:text-text-primary hover:bg-background-primary"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Mark all as read
            </Button>
          </div>
        )}

        {/* Notification list */}
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border-default bg-background-secondary py-16">
            <Bell className="mb-4 h-12 w-12 text-text-tertiary" />
            <h2 className="mb-2 text-lg font-medium text-text-primary">
              No notifications
            </h2>
            <p className="text-text-secondary">
              {unreadOnly
                ? 'You have no unread notifications.'
                : 'You have no notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-default bg-background-secondary">
            {filteredNotifications.map((notification) => {
              const IconComponent =
                typeIcon[notification.type as NotificationType] ?? Bell
              const isUnread = !notification.readAt

              return (
                <div
                  key={notification.id}
                  className={`flex cursor-pointer items-start gap-4 border-b border-border-default px-4 py-3 transition-colors hover:bg-background-primary/50 last:border-b-0 ${
                    isUnread ? 'bg-blue-500/5' : ''
                  }`}
                  onClick={() => handleRowClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRowClick(notification)
                    }
                  }}
                >
                  <div
                    className="pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(notification.id, !!checked)
                      }
                      aria-label={`Select notification: ${notification.title}`}
                    />
                  </div>

                  <div className="flex-shrink-0 pt-0.5">
                    <IconComponent className="h-5 w-5 text-text-tertiary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm ${
                          isUnread
                            ? 'font-semibold text-text-primary'
                            : 'font-medium text-text-secondary'
                        }`}
                      >
                        {notification.title}
                      </span>
                      {isUnread && (
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-text-tertiary">
                      {notification.body}
                    </p>
                  </div>

                  <span className="flex-shrink-0 whitespace-nowrap text-xs text-text-tertiary">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Load more */}
        {filteredNotifications.length >= 20 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              className="border-border-default text-text-secondary hover:text-text-primary hover:bg-background-primary"
            >
              Load more
            </Button>
          </div>
        )}

        {/* Summary */}
        {filteredNotifications.length > 0 && (
          <div className="mt-4 text-sm text-text-tertiary">
            Showing {filteredNotifications.length} notification
            {filteredNotifications.length !== 1 ? 's' : ''}
          </div>
        )}
      </main>
    </div>
  )
}
