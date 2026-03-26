import { format, formatDistanceToNowStrict } from 'date-fns'

/**
 * Format a date string as a compact relative time (e.g. "5m ago", "2d ago").
 * Falls back to "Jan 5" for dates older than 6 days.
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return 'just now'

  const diffDays = Math.floor(diffSec / 86400)
  if (diffDays >= 7) {
    return format(date, 'MMM d')
  }

  const distance = formatDistanceToNowStrict(date, { addSuffix: false })
  // formatDistanceToNowStrict returns "5 minutes", "2 hours", "3 days" etc.
  // Convert to compact: "5m ago", "2h ago", "3d ago"
  const compact = distance
    .replace(/ seconds?/, 's')
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')
  return `${compact} ago`
}

/** Format a date string as "Jan 5, 2025, 02:30 PM". */
export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy, hh:mm a')
}
