import { resolveFailureMessage } from '@bc-solutions-coder/api-errors'
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
import { Badge } from '@bcordes/ui/components/badge'
import { Button } from '@bcordes/ui/components/button'
import { Checkbox } from '@bcordes/ui/components/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@bcordes/ui/components/tabs'
import type { Notification, NotificationType } from '@/features/notifications'
import { serverRequireAuth } from '@/shared/auth'
import {
  NotificationRow,
  fetchNotifications,
  getNotificationRoute,
  invalidateNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationTypes,
  useEventStreamEvents,
  useNotificationFilters,
  useNotificationSelection,
} from '@/features/notifications'

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
    filtered: filteredNotifications,
    unreadCount,
    handleTabChange,
    handleTypeFilter,
  } = useNotificationFilters(notifications)

  const { selectedIds, allSelected, selectAll, selectOne } =
    useNotificationSelection(filteredNotifications)

  useEventStreamEvents({
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
      toast.error(resolveFailureMessage(error))
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
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
        <p className="mb-4 text-sm text-muted-foreground">
          Showing up to 20 notifications. Filters apply to this list.
        </p>
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
                  : 'border-border text-foreground-secondary hover:text-foreground hover:bg-background'
              }
            >
              {NOTIFICATION_TYPE_CONFIG[type].label}
            </Button>
          ))}
        </div>

        {filteredNotifications.length > 0 && (
          <div className="mb-4 flex items-center gap-4 rounded-lg border border-border bg-secondary px-4 py-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => selectAll(!!checked)}
              aria-label="Select all notifications"
            />
            <span className="text-sm text-foreground-secondary">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : 'Select all'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
              className="ml-auto border-border text-foreground-secondary hover:text-foreground hover:bg-background"
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

        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-16">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-medium text-foreground">
              {unreadOnly || activeType
                ? 'No notifications match these filters in the loaded list.'
                : 'No notifications in this list.'}
            </h2>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-secondary">
            {filteredNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                selectedIds={selectedIds}
                typeConfig={NOTIFICATION_TYPE_CONFIG}
                onSelect={selectOne}
                onClick={handleRowClick}
              />
            ))}
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredNotifications.length} of {notifications.length}{' '}
          loaded notifications
        </div>
      </main>
    </div>
  )
}
