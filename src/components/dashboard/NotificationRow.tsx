import { Bell } from 'lucide-react'
import type { Notification } from '@/lib/wallow/types'
import type { NotificationType } from '@/hooks/useNotificationFilters'
import { formatRelativeTime } from '@/lib/format'
import { Checkbox } from '@/components/ui/checkbox'

export interface NotificationTypeConfig {
  icon: typeof Bell
  label: string
}

export interface NotificationRowProps {
  notification: Notification
  selectedIds: ReadonlySet<string>
  typeConfig: Partial<Record<string, NotificationTypeConfig>>
  onSelect: (id: string, checked: boolean) => void
  onClick: (notification: Notification) => void
}

export function NotificationRow({
  notification,
  selectedIds,
  typeConfig,
  onSelect,
  onClick,
}: NotificationRowProps) {
  const config = typeConfig[notification.type]
  const IconComponent = config?.icon ?? Bell
  const isUnread = !notification.isRead

  return (
    <div
      className={`flex cursor-pointer items-start gap-4 border-b border-border px-4 py-3 transition-colors hover:bg-background/50 last:border-b-0 ${
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
        <IconComponent className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              isUnread
                ? 'font-semibold text-foreground'
                : 'font-medium text-foreground-secondary'
            }`}
          >
            {notification.title}
          </span>
          {isUnread && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {notification.message}
        </p>
      </div>

      <span className="flex-shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        {formatRelativeTime(notification.createdAt)}
      </span>
    </div>
  )
}
