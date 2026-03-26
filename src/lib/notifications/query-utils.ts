import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalidate all notification-related queries (list + unread count).
 * Centralises the cache-busting pattern used across notification UI.
 */
export function invalidateNotifications(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  queryClient.invalidateQueries({
    queryKey: ['notifications', 'unread-count'],
  })
}
