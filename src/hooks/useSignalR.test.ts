import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { RealtimeEnvelope } from '@/lib/wallow/types'

/* ------------------------------------------------------------------ */
/*  EventSource mock                                                    */
/* ------------------------------------------------------------------ */

interface MockEventSource {
  url: string
  onopen: ((ev: Event) => void) | null
  onerror: ((ev: Event) => void) | null
  onmessage: ((ev: MessageEvent) => void) | null
  close: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  _namedListeners: Map<string, Array<(ev: MessageEvent) => void>>
}

let mockEventSources: MockEventSource[]

function createMockEventSource(url: string): MockEventSource {
  const instance: MockEventSource = {
    url,
    onopen: null,
    onerror: null,
    onmessage: null,
    close: vi.fn(),
    addEventListener: vi.fn(
      (type: string, handler: (ev: MessageEvent) => void) => {
        if (!instance._namedListeners.has(type)) {
          instance._namedListeners.set(type, [])
        }
        instance._namedListeners.get(type)!.push(handler)
      },
    ),
    removeEventListener: vi.fn(),
    _namedListeners: new Map(),
  }
  mockEventSources.push(instance)
  return instance
}

function latestES(): MockEventSource {
  return mockEventSources[mockEventSources.length - 1]
}

function fireOpen(es: MockEventSource) {
  es.onopen?.(new Event('open'))
}

function fireError(es: MockEventSource) {
  es.onerror?.(new Event('error'))
}

function fireMessage(es: MockEventSource, data: unknown) {
  const event = new MessageEvent('message', {
    data: JSON.stringify(data),
  })
  es.onmessage?.(event)
}

function fireNamedEvent(
  es: MockEventSource,
  eventType: string,
  data: unknown,
) {
  const event = new MessageEvent(eventType, {
    data: JSON.stringify(data),
  })
  const listeners = es._namedListeners.get(eventType) ?? []
  listeners.forEach((l) => l(event))
}

/* ------------------------------------------------------------------ */
/*  Setup / teardown                                                    */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  mockEventSources = []
  vi.stubGlobal(
    'EventSource',
    vi.fn((url: string) => createMockEventSource(url)),
  )
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/* ------------------------------------------------------------------ */
/*  Lazy import so the global mock is in place                          */
/* ------------------------------------------------------------------ */

async function importHook() {
  const mod = await import('./useSignalR')
  return mod.useSignalR
}

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

describe('useSignalR', () => {
  it('starts connection on mount and transitions connecting -> connected', async () => {
    const useSignalR = await importHook()

    const { result } = renderHook(() => useSignalR())

    // Should be connecting initially
    expect(result.current.status).toBe('connecting')
    expect(mockEventSources).toHaveLength(1)
    expect(latestES().url).toBe('/api/notifications/stream')

    // Simulate server open
    act(() => {
      fireOpen(latestES())
    })

    expect(result.current.status).toBe('connected')
  })

  it('dispatches generic message events to type-matched subscribers', async () => {
    const useSignalR = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useSignalR())

    // Subscribe
    act(() => {
      result.current.subscribe('NotificationCreated', handler)
    })

    act(() => {
      fireOpen(latestES())
    })

    const envelope: RealtimeEnvelope = {
      type: 'NotificationCreated',
      module: 'notifications',
      payload: { id: '1' },
      timestamp: '2026-03-25T00:00:00Z',
    }

    act(() => {
      fireMessage(latestES(), envelope)
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(envelope)
  })

  it('dispatches named SSE events to type-matched subscribers', async () => {
    const useSignalR = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useSignalR())

    act(() => {
      result.current.subscribe('NotificationCreated', handler)
    })

    act(() => {
      fireOpen(latestES())
    })

    const envelope: RealtimeEnvelope = {
      type: 'NotificationCreated',
      module: 'notifications',
      payload: { id: '2' },
      timestamp: '2026-03-25T00:00:00Z',
    }

    act(() => {
      fireNamedEvent(latestES(), 'NotificationCreated', envelope)
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(envelope)
  })

  it('does not dispatch to handlers for non-matching types', async () => {
    const useSignalR = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useSignalR())

    act(() => {
      result.current.subscribe('TaskAssigned', handler)
    })

    act(() => {
      fireOpen(latestES())
    })

    const envelope: RealtimeEnvelope = {
      type: 'NotificationCreated',
      module: 'notifications',
      payload: {},
      timestamp: '2026-03-25T00:00:00Z',
    }

    act(() => {
      fireMessage(latestES(), envelope)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('unsubscribe removes the handler', async () => {
    const useSignalR = await importHook()

    const handler = vi.fn()
    let unsubscribe: () => void
    const { result } = renderHook(() => useSignalR())

    act(() => {
      unsubscribe = result.current.subscribe('SystemAlert', handler)
    })

    act(() => {
      fireOpen(latestES())
    })

    const envelope: RealtimeEnvelope = {
      type: 'SystemAlert',
      module: 'system',
      payload: {},
      timestamp: '2026-03-25T00:00:00Z',
    }

    // First event should reach handler
    act(() => {
      fireMessage(latestES(), envelope)
    })
    expect(handler).toHaveBeenCalledTimes(1)

    // Unsubscribe
    act(() => {
      unsubscribe()
    })

    // Second event should NOT reach handler
    act(() => {
      fireMessage(latestES(), envelope)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  describe('exponential backoff reconnect', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('reconnects with exponential backoff on error', async () => {
      const useSignalR = await importHook()

      const { result } = renderHook(() => useSignalR())

      // First connection
      expect(mockEventSources).toHaveLength(1)

      act(() => {
        fireOpen(latestES())
      })
      expect(result.current.status).toBe('connected')

      // Trigger error — should close and go disconnected
      act(() => {
        fireError(latestES())
      })
      expect(result.current.status).toBe('disconnected')
      expect(latestES().close).toHaveBeenCalled()

      // No reconnect yet
      expect(mockEventSources).toHaveLength(1)

      // Advance past first backoff (1000ms = 1000 * 2^0)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(mockEventSources).toHaveLength(2)
      expect(result.current.status).toBe('reconnecting')

      // Open second connection
      act(() => {
        fireOpen(latestES())
      })
      expect(result.current.status).toBe('connected')

      // Trigger error again
      act(() => {
        fireError(latestES())
      })
      expect(result.current.status).toBe('disconnected')

      // Second backoff should be 1000ms (attempt reset to 0 on success, so 2^0 again)
      act(() => {
        vi.advanceTimersByTime(999)
      })
      expect(mockEventSources).toHaveLength(2)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(mockEventSources).toHaveLength(3)
    })

    it('increases backoff delay for consecutive failures', async () => {
      const useSignalR = await importHook()

      renderHook(() => useSignalR())

      // First connection attempt already happened
      expect(mockEventSources).toHaveLength(1)

      // Error without ever connecting (attempt 0 -> delay 1000ms)
      act(() => {
        fireError(latestES())
      })

      // Advance 1000ms -> reconnect attempt 1
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(mockEventSources).toHaveLength(2)

      // Error again (attempt 1 -> delay 2000ms)
      act(() => {
        fireError(latestES())
      })

      act(() => {
        vi.advanceTimersByTime(1999)
      })
      expect(mockEventSources).toHaveLength(2)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(mockEventSources).toHaveLength(3)

      // Error again (attempt 2 -> delay 4000ms)
      act(() => {
        fireError(latestES())
      })

      act(() => {
        vi.advanceTimersByTime(3999)
      })
      expect(mockEventSources).toHaveLength(3)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(mockEventSources).toHaveLength(4)
    })

    it('caps backoff at 30 seconds', async () => {
      const useSignalR = await importHook()

      renderHook(() => useSignalR())

      // Fail many times to exceed 30s cap
      // attempt 0: 1s, 1: 2s, 2: 4s, 3: 8s, 4: 16s, 5: 30s (capped)
      for (let i = 0; i < 5; i++) {
        act(() => {
          fireError(latestES())
        })
        const delay = Math.min(1000 * Math.pow(2, i), 30000)
        act(() => {
          vi.advanceTimersByTime(delay)
        })
      }

      // Now at attempt 5, error again — delay should be capped at 30000
      const countBefore = mockEventSources.length
      act(() => {
        fireError(latestES())
      })

      // Not reconnected at 29999ms
      act(() => {
        vi.advanceTimersByTime(29999)
      })
      expect(mockEventSources).toHaveLength(countBefore)

      // Reconnected at 30000ms
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(mockEventSources).toHaveLength(countBefore + 1)
    })
  })

  it('closes EventSource and clears timers on unmount', async () => {
    vi.useFakeTimers()
    const useSignalR = await importHook()

    const { result, unmount } = renderHook(() => useSignalR())

    const es = latestES()

    act(() => {
      fireOpen(es)
    })
    expect(result.current.status).toBe('connected')

    unmount()

    expect(es.close).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('clears reconnect timer on unmount during backoff', async () => {
    vi.useFakeTimers()
    const useSignalR = await importHook()

    const { unmount } = renderHook(() => useSignalR())

    // Trigger error to start reconnect timer
    act(() => {
      fireError(latestES())
    })

    const sourceCountBeforeUnmount = mockEventSources.length

    unmount()

    // Advance past the backoff — should NOT create a new connection
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(mockEventSources).toHaveLength(sourceCountBeforeUnmount)

    vi.useRealTimers()
  })

  it('ignores malformed message data gracefully', async () => {
    const useSignalR = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useSignalR())

    act(() => {
      result.current.subscribe('Foo', handler)
    })

    act(() => {
      fireOpen(latestES())
    })

    // Send malformed data (non-JSON)
    act(() => {
      const event = new MessageEvent('message', { data: 'not json' })
      latestES().onmessage?.(event)
    })

    expect(handler).not.toHaveBeenCalled()
  })
})
