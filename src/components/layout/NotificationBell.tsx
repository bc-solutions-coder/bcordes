'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'

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
  markNotificationRead,
} from '@/server-fns/notifications'
import type { Notification } from '@/lib/wallow/types'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  )
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { subscribe } = useSignalR()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribe('NotificationCreated', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    return unsubscribe
  }, [user, subscribe, queryClient])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications],
  )

  const handleClick = useCallback(
    async (notification: Notification) => {
      if (!notification.readAt) {
        await markNotificationRead({ data: { id: notification.id } })
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      }
      navigate({ to: '/dashboard/inquiries' })
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
          className="relative hidden md:inline-flex text-text-secondary hover:text-accent-primary"
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
        <div className="border-b border-border-default px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Notifications
          </h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-secondary">
              No notifications
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-background-secondary ${
                  n.readAt ? 'opacity-60' : ''
                }`}
              >
                <p className="text-sm font-medium text-text-primary">
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
                  {n.body}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {timeAgo(n.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
