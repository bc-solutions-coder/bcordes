import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
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

let mockEventSources: Array<MockEventSource>

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

function fireNamedEvent(es: MockEventSource, eventType: string, data: unknown) {
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
  const mod = await import('./useEventStream')
  return mod.useEventStream
}

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

describe('useEventStream', () => {
  it('starts connection on mount and transitions connecting -> connected', async () => {
    const useEventStream = await importHook()

    const { result } = renderHook(() => useEventStream())

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
    const useEventStream = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useEventStream())

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
    const useEventStream = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useEventStream())

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
    const useEventStream = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useEventStream())

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
    const useEventStream = await importHook()

    const handler = vi.fn()
    let unsubscribe: () => void
    const { result } = renderHook(() => useEventStream())

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
      const useEventStream = await importHook()

      const { result } = renderHook(() => useEventStream())

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
      const useEventStream = await importHook()

      renderHook(() => useEventStream())

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
      const useEventStream = await importHook()

      renderHook(() => useEventStream())

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
    const useEventStream = await importHook()

    const { result, unmount } = renderHook(() => useEventStream())

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
    const useEventStream = await importHook()

    const { unmount } = renderHook(() => useEventStream())

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

  describe('attempt cap', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('stops reconnecting after 10 consecutive errors', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream())

      // Initial connection is attempt 0
      expect(mockEventSources).toHaveLength(1)

      // Fail 10 times, advancing through each backoff
      for (let i = 0; i < 10; i++) {
        act(() => {
          fireError(latestES())
        })
        const delay = Math.min(1000 * Math.pow(2, i), 30000)
        act(() => {
          vi.advanceTimersByTime(delay)
        })
      }

      const countAfter10Failures = mockEventSources.length

      // The 11th error should NOT schedule another reconnect
      act(() => {
        fireError(latestES())
      })

      // Advance well past any possible backoff
      act(() => {
        vi.advanceTimersByTime(120000)
      })

      // No new EventSource should have been created
      expect(mockEventSources).toHaveLength(countAfter10Failures)
    })
  })

  describe('connection timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('closes EventSource and transitions to reconnecting after 10s timeout when onopen never fires', async () => {
      const useEventStream = await importHook()

      const { result } = renderHook(() => useEventStream())

      expect(result.current.status).toBe('connecting')
      const es = latestES()

      // Do NOT fire onopen — simulate a hung connection
      // After 10 seconds the hook should close the EventSource and start reconnecting
      act(() => {
        vi.advanceTimersByTime(10000)
      })

      expect(es.close).toHaveBeenCalled()
      expect(
        result.current.status === 'reconnecting' ||
          result.current.status === 'disconnected',
      ).toBe(true)

      // A new EventSource should eventually be created
      act(() => {
        vi.advanceTimersByTime(30000)
      })
      expect(mockEventSources.length).toBeGreaterThan(1)
    })
  })

  describe('visibility-aware reconnect', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('reconnects immediately when tab becomes visible while disconnected', async () => {
      const useEventStream = await importHook()

      const { result } = renderHook(() => useEventStream())

      // Connect then disconnect
      act(() => {
        fireOpen(latestES())
      })
      act(() => {
        fireError(latestES())
      })
      expect(result.current.status).toBe('disconnected')

      const countBeforeVisible = mockEventSources.length

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Should trigger an immediate reconnect (no waiting for backoff timer)
      expect(mockEventSources.length).toBeGreaterThan(countBeforeVisible)
    })

    it('resets attempts and reconnects when visible after max attempts reached', async () => {
      const useEventStream = await importHook()

      const { result } = renderHook(() => useEventStream())

      // Exhaust all 10 attempts
      for (let i = 0; i < 10; i++) {
        act(() => {
          fireError(latestES())
        })
        const delay = Math.min(1000 * Math.pow(2, i), 30000)
        act(() => {
          vi.advanceTimersByTime(delay)
        })
      }

      // One more error — should be at the cap now
      act(() => {
        fireError(latestES())
      })
      act(() => {
        vi.advanceTimersByTime(120000)
      })

      const countAtMax = mockEventSources.length

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Should reset attempts and create a new connection
      expect(mockEventSources.length).toBeGreaterThan(countAtMax)
      expect(result.current.status).toBe('connecting')
    })
  })

  describe('reconnect SSE event', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('resets attempt counter and schedules fresh connection on named reconnect event', async () => {
      const useEventStream = await importHook()

      const { result } = renderHook(() => useEventStream())

      act(() => {
        fireOpen(latestES())
      })
      expect(result.current.status).toBe('connected')

      // Simulate several consecutive failures to bump the attempt counter
      act(() => {
        fireError(latestES())
      })
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      act(() => {
        fireError(latestES())
      })
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      act(() => {
        fireOpen(latestES())
      })

      const countBefore = mockEventSources.length

      // Server sends a named 'reconnect' SSE event
      act(() => {
        fireNamedEvent(latestES(), 'reconnect', {
          type: 'reconnect',
          module: 'system',
          payload: {},
          timestamp: '2026-03-25T00:00:00Z',
        })
      })

      // The hook should close the current connection and schedule a fresh one
      // with the attempt counter reset to 0 (so delay should be 1000ms = 2^0 * 1000)
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockEventSources.length).toBeGreaterThan(countBefore)
      // Verify it used the reset delay (1s, not escalated)
      expect(result.current.status).toBe('connecting')
    })
  })

  describe('BroadcastChannel leader election', () => {
    let MockBroadcastChannelClass: ReturnType<typeof vi.fn>
    let mockChannelInstances: Array<{
      name: string
      postMessage: ReturnType<typeof vi.fn>
      close: ReturnType<typeof vi.fn>
      onmessage: ((ev: MessageEvent) => void) | null
    }>

    beforeEach(() => {
      vi.useFakeTimers()
      mockChannelInstances = []
      MockBroadcastChannelClass = vi.fn((name: string) => {
        const instance = {
          name,
          postMessage: vi.fn(),
          close: vi.fn(),
          onmessage: null as ((ev: MessageEvent) => void) | null,
        }
        mockChannelInstances.push(instance)
        return instance
      })
      vi.stubGlobal('BroadcastChannel', MockBroadcastChannelClass)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    function latestChannel() {
      return mockChannelInstances[mockChannelInstances.length - 1]
    }

    it('only one EventSource is created when useEventStream is mounted — the tab becomes leader', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream())

      // The mounting tab should become leader and create exactly one EventSource
      expect(mockEventSources).toHaveLength(1)
      expect(latestES().url).toBe('/api/notifications/stream')
    })

    it('a follower promotes itself to leader after 7s without heartbeat', async () => {
      const useEventStream = await importHook()

      // Mount the hook — it should detect an existing leader via BroadcastChannel
      // and NOT create an EventSource (follower mode)
      renderHook(() => useEventStream())

      // Simulate being a follower: the hook should not have created an EventSource
      // if it detected another leader. Since the current implementation always creates one,
      // this test verifies the future behavior where a follower tab defers.
      // For now: we expect the follower to promote itself after 7s of no heartbeats.

      const channel = latestChannel()
      expect(channel).toBeDefined()

      // Simulate the follower receiving no heartbeat for 7 seconds
      const countBefore = mockEventSources.length

      act(() => {
        vi.advanceTimersByTime(7000)
      })

      // After 7s without heartbeat, the follower should promote itself and create an EventSource
      expect(mockEventSources.length).toBeGreaterThan(countBefore)
    })

    it('an event message on BroadcastChannel calls follower subscribers without an open EventSource', async () => {
      const useEventStream = await importHook()

      const handler = vi.fn()
      const { result } = renderHook(() => useEventStream())

      act(() => {
        result.current.subscribe('NotificationCreated', handler)
      })

      const channel = latestChannel()
      expect(channel).toBeDefined()
      expect(channel.onmessage).toBeTypeOf('function')

      const envelope: RealtimeEnvelope = {
        type: 'NotificationCreated',
        module: 'notifications',
        payload: { id: '99' },
        timestamp: '2026-03-25T00:00:00Z',
      }

      // Simulate receiving an event via BroadcastChannel (relayed by the leader tab)
      act(() => {
        channel.onmessage!(
          new MessageEvent('message', {
            data: { type: 'event', envelope },
          }),
        )
      })

      // The follower's subscriber should be called even though it has no EventSource
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(envelope)
    })

    it('follower promotes itself after receiving leader-resign message and timeout elapses', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream())

      const channel = latestChannel()
      expect(channel).toBeDefined()
      expect(channel.onmessage).toBeTypeOf('function')

      const countBefore = mockEventSources.length

      // Simulate receiving a leader-resign message via BroadcastChannel
      act(() => {
        channel.onmessage!(
          new MessageEvent('message', {
            data: { type: 'leader-resign' },
          }),
        )
      })

      // No immediate promotion — must wait for LEADER_TIMEOUT_MS (7000ms)
      act(() => {
        vi.advanceTimersByTime(6999)
      })
      expect(mockEventSources.length).toBe(countBefore)

      // After the full timeout, the follower should promote itself and create a new EventSource
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(mockEventSources.length).toBeGreaterThan(countBefore)
    })

    it('on leader unmount, postMessage is called with { type: "leader-resign" }', async () => {
      const useEventStream = await importHook()

      const { unmount } = renderHook(() => useEventStream())

      act(() => {
        fireOpen(latestES())
      })

      const channel = latestChannel()
      expect(channel).toBeDefined()

      unmount()

      // On unmount, the leader should broadcast a resign message
      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'leader-resign',
      })
    })
  })

  it('ignores malformed message data gracefully', async () => {
    const useEventStream = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useEventStream())

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
