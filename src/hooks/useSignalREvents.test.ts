import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { RealtimeEnvelope } from '@/lib/wallow/types'

const mockUnsubscribe1 = vi.fn()
const mockUnsubscribe2 = vi.fn()
const mockSubscribe = vi.fn()

vi.mock('@/hooks/useSignalR', () => ({
  useSignalR: () => ({
    subscribe: mockSubscribe,
    status: 'connected' as const,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSubscribe
    .mockReturnValueOnce(mockUnsubscribe1)
    .mockReturnValueOnce(mockUnsubscribe2)
})

describe('useSignalREvents', () => {
  it('subscribes for each event key on mount', async () => {
    const { useSignalREvents } = await import('./useSignalREvents')

    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const events: Record<string, (envelope: RealtimeEnvelope) => void> = {
      NotificationCreated: handler1,
      TaskAssigned: handler2,
    }

    renderHook(() => useSignalREvents(events))

    expect(mockSubscribe).toHaveBeenCalledTimes(2)
    expect(mockSubscribe).toHaveBeenCalledWith('NotificationCreated', handler1)
    expect(mockSubscribe).toHaveBeenCalledWith('TaskAssigned', handler2)
  })

  it('calls unsubscribe functions on unmount', async () => {
    const { useSignalREvents } = await import('./useSignalREvents')

    const events: Record<string, (envelope: RealtimeEnvelope) => void> = {
      NotificationCreated: vi.fn(),
      TaskAssigned: vi.fn(),
    }

    const { unmount } = renderHook(() => useSignalREvents(events))

    expect(mockUnsubscribe1).not.toHaveBeenCalled()
    expect(mockUnsubscribe2).not.toHaveBeenCalled()

    unmount()

    expect(mockUnsubscribe1).toHaveBeenCalledTimes(1)
    expect(mockUnsubscribe2).toHaveBeenCalledTimes(1)
  })

  it('subscribes to a single event', async () => {
    mockSubscribe.mockReset()
    const unsub = vi.fn()
    mockSubscribe.mockReturnValueOnce(unsub)

    const { useSignalREvents } = await import('./useSignalREvents')

    const handler = vi.fn()
    renderHook(() => useSignalREvents({ SystemAlert: handler }))

    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribe).toHaveBeenCalledWith('SystemAlert', handler)
  })

  it('handles empty events record', async () => {
    mockSubscribe.mockReset()

    const { useSignalREvents } = await import('./useSignalREvents')

    const { unmount } = renderHook(() => useSignalREvents({}))

    expect(mockSubscribe).not.toHaveBeenCalled()

    // Should not throw on unmount with no subscriptions
    unmount()
  })
})
