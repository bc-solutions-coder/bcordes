import { useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardList,
  CreditCard,
  Loader2,
  Mail,
  Megaphone,
  MessageCircleReply,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Notification } from '@/lib/wallow/types'
import type { NotificationType } from '@/hooks/useNotificationFilters'
import { serverRequireAuth } from '@/server-fns/auth'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/server-fns/notifications'
import { invalidateNotifications } from '@/lib/notifications/query-utils'
import { getNotificationRoute } from '@/lib/notifications/routing'
import { formatRelativeTime } from '@/lib/format'
import { useSignalREvents } from '@/hooks/useSignalREvents'
import {
  notificationTypes,
  useNotificationFilters,
} from '@/hooks/useNotificationFilters'
import { useNotificationSelection } from '@/hooks/useNotificationSelection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface NotificationRowProps {
  notification: Notification
  selectedIds: ReadonlySet<string>
  onSelect: (id: string, checked: boolean) => void
  onClick: (notification: Notification) => void
}

function NotificationRow({
  notification,
  selectedIds,
  onSelect,
  onClick,
}: NotificationRowProps) {
  const typeConfig = (
    NOTIFICATION_TYPE_CONFIG as Partial<
      Record<string, (typeof NOTIFICATION_TYPE_CONFIG)[NotificationType]>
    >
  )[notification.type]
  const IconComponent = typeConfig?.icon ?? Bell
  const isUnread = !notification.isRead

  return (
    <div
      className={`flex cursor-pointer items-start gap-4 border-b border-border-default px-4 py-3 transition-colors hover:bg-background-primary/50 last:border-b-0 ${
        isUnread ? 'bg-blue-500/5' : ''
      }`}
      onClick={() => onClick(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(notification)
        }
      }}
    >
      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selectedIds.has(notification.id)}
          onCheckedChange={(checked) => onSelect(notification.id, !!checked)}
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
          {notification.message}
        </p>
      </div>

      <span className="flex-shrink-0 whitespace-nowrap text-xs text-text-tertiary">
        {formatRelativeTime(notification.createdAt)}
      </span>
    </div>
  )
}

const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Bell; label: string }
> = {
  TaskAssigned: { icon: ClipboardList, label: 'Tasks' },
  InquirySubmitted: { icon: Mail, label: 'Inquiries' },
  InquiryComment: { icon: MessageCircleReply, label: 'Inquiry Replies' },
  SystemAlert: { icon: AlertTriangle, label: 'Alerts' },
  Announcement: { icon: Megaphone, label: 'Announcements' },
  BillingInvoice: { icon: CreditCard, label: 'Billing' },
  Mention: { icon: MessageSquare, label: 'Mentions' },
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
  const { data: notifications = initialNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(),
    initialData: initialNotifications,
  })

  const {
    unreadOnly,
    activeType,
    page,
    setPage,
    filtered: filteredNotifications,
    unreadCount,
    handleTabChange,
    handleTypeFilter,
  } = useNotificationFilters(notifications)

  const { selectedIds, allSelected, selectAll, selectOne } =
    useNotificationSelection(filteredNotifications)

  useSignalREvents({
    NotificationCreated: () => invalidateNotifications(queryClient),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => {
      invalidateNotifications(queryClient)
    },
    onError: () => {
      toast.error('Failed to mark notification as read')
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      invalidateNotifications(queryClient)
      toast.success('All notifications marked as read')
    },
    onError: (error) => {
      toast.error(`Failed to mark all as read: ${error.message}`)
    },
  })

  const handleRowClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markReadMutation.mutate(notification.id)
      }
      navigate({ to: getNotificationRoute(notification) })
    },
    [markReadMutation, navigate],
  )

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
              {NOTIFICATION_TYPE_CONFIG[type].label}
            </Button>
          ))}
        </div>

        {/* Bulk actions toolbar */}
        {filteredNotifications.length > 0 && (
          <div className="mb-4 flex items-center gap-4 rounded-lg border border-border-default bg-background-secondary px-4 py-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => selectAll(!!checked)}
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
            {filteredNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                selectedIds={selectedIds}
                onSelect={selectOne}
                onClick={handleRowClick}
              />
            ))}
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
