import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'
import { invalidateNotifications } from '@/lib/notifications/query-utils'

function createMockQueryClient(): QueryClient {
  return {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient
}

describe('invalidateNotifications', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createMockQueryClient()
  })

  it('invalidates the notifications list query', () => {
    invalidateNotifications(queryClient)

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications'],
    })
  })

  it('invalidates the unread-count query', () => {
    invalidateNotifications(queryClient)

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications', 'unread-count'],
    })
  })

  it('calls invalidateQueries exactly twice', () => {
    invalidateNotifications(queryClient)

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2)
  })
})
