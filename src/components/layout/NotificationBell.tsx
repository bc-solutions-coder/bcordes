'use client'

import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'

import type { Notification } from '@/lib/wallow/types'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUser } from '@/hooks/useUser'
import { useSignalR } from '@/hooks/useSignalR'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/server-fns/notifications'
import { invalidateNotifications } from '@/lib/notifications/query-utils'
import { getNotificationRoute } from '@/lib/notifications/routing'
import { formatRelativeTime } from '@/lib/format'

export function NotificationBell() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { subscribe } = useSignalR()

  const { data: notifications = [] } = useQuery<Array<Notification>>({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetchUnreadCount(),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      invalidateNotifications(queryClient)
      toast.success('All notifications marked as read')
    },
    onError: (error) => {
      toast.error(`Failed to mark notifications as read: ${error.message}`)
    },
  })

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribe('NotificationCreated', (envelope) => {
      // Optimistically bump the unread count immediately
      queryClient.setQueryData<number>(
        ['notifications', 'unread-count'],
        (old) => (old ?? 0) + 1,
      )
      // Then refetch both queries for accurate data
      invalidateNotifications(queryClient)
      if (document.visibilityState === 'visible') {
        const payload = envelope.payload as Record<string, unknown> | undefined
        const title = (payload?.title ?? payload?.Title) as string | undefined
        toast(title ?? 'New notification')
      }
    })
    return unsubscribe
  }, [user, subscribe, queryClient])

  const displayedNotifications = notifications.slice(0, 5)

  const handleClick = useCallback(
    async (notification: Notification) => {
      if (!notification.isRead) {
        await markNotificationRead({ data: { id: notification.id } })
        invalidateNotifications(queryClient)
      }
      navigate({ to: getNotificationRoute(notification) })
    },
    [navigate, queryClient],
  )

  if (!user) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-text-secondary hover:text-accent-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-accent-primary hover:text-accent-primary/80"
              onClick={(e) => {
                e.stopPropagation()
                markAllRead.mutate()
              }}
              disabled={markAllRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {displayedNotifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-secondary">
              No notifications
            </p>
          ) : (
            displayedNotifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-background-secondary ${
                  n.isRead ? 'opacity-60' : ''
                }`}
              >
                <p className="text-sm font-medium text-text-primary">
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {formatRelativeTime(n.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border-default px-4 py-2">
          <Link
            to="/dashboard/notifications"
            className="block text-center text-xs font-medium text-accent-primary hover:text-accent-primary/80"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
