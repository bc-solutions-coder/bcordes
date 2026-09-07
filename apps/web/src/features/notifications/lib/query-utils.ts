import type { QueryClient } from '@tanstack/react-query'

/** Invalidate the notification list and unread count. */
export function invalidateNotifications(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  queryClient.invalidateQueries({
    queryKey: ['notifications', 'unread-count'],
  })
}
