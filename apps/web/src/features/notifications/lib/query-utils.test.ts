import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateNotifications } from './query-utils'
import type { QueryClient } from '@tanstack/react-query'

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
