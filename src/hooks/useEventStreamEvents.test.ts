import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { RealtimeEnvelope } from '@/lib/wallow/types'

const mockUnsubscribe1 = vi.fn()
const mockUnsubscribe2 = vi.fn()
const mockSubscribe = vi.fn()

vi.mock('@/hooks/useEventStream', () => ({
  useEventStream: () => ({
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

describe('useEventStreamEvents', () => {
  it('subscribes for each event key on mount', async () => {
    const { useEventStreamEvents } = await import('./useEventStreamEvents')

    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const events: Record<string, (envelope: RealtimeEnvelope) => void> = {
      NotificationCreated: handler1,
      TaskAssigned: handler2,
    }

    renderHook(() => useEventStreamEvents(events))

    expect(mockSubscribe).toHaveBeenCalledTimes(2)
    expect(mockSubscribe).toHaveBeenCalledWith('NotificationCreated', handler1)
    expect(mockSubscribe).toHaveBeenCalledWith('TaskAssigned', handler2)
  })

  it('calls unsubscribe functions on unmount', async () => {
    const { useEventStreamEvents } = await import('./useEventStreamEvents')

    const events: Record<string, (envelope: RealtimeEnvelope) => void> = {
      NotificationCreated: vi.fn(),
      TaskAssigned: vi.fn(),
    }

    const { unmount } = renderHook(() => useEventStreamEvents(events))

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

    const { useEventStreamEvents } = await import('./useEventStreamEvents')

    const handler = vi.fn()
    renderHook(() => useEventStreamEvents({ SystemAlert: handler }))

    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribe).toHaveBeenCalledWith('SystemAlert', handler)
  })

  it('handles empty events record', async () => {
    mockSubscribe.mockReset()

    const { useEventStreamEvents } = await import('./useEventStreamEvents')

    const { unmount } = renderHook(() => useEventStreamEvents({}))

    expect(mockSubscribe).not.toHaveBeenCalled()

    // Should not throw on unmount with no subscriptions
    unmount()
  })
})
