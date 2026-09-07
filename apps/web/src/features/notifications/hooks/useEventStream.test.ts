import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import React from 'react'
import type { RealtimeEnvelope } from '@bcordes/wallow/types'

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

const mockUser = { id: 'test-user', name: 'Test' }
vi.mock('@/shared/auth', () => ({
  useUser: () => ({ user: mockUser, isLoading: false }),
}))

beforeEach(() => {
  mockEventSources = []
  vi.stubGlobal(
    'EventSource',
    vi.fn((url: string) => createMockEventSource(url)),
  )
  // Use direct connections unless a test enables BroadcastChannel.
  vi.stubGlobal('BroadcastChannel', undefined)
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// Import after installing the global mocks.

async function importHook() {
  const mod = await import('./useEventStream')
  return mod.useEventStream
}

async function importProvider() {
  const mod = await import('./EventStreamProvider')
  return mod.EventStreamProvider
}

let Wrapper: React.FC<{ children: React.ReactNode }>

async function setupWrapper() {
  const EventStreamProvider = await importProvider()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  Wrapper = function WrapperComponent({
    children,
  }: {
    children: React.ReactNode
  }) {
    return React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(EventStreamProvider, null, children),
    )
  }
}

describe('useEventStream', () => {
  beforeEach(async () => {
    await setupWrapper()
  })

  it('starts connection on mount and transitions connecting -> connected', async () => {
    const useEventStream = await importHook()

    const { result } = renderHook(() => useEventStream(), { wrapper: Wrapper })

    expect(result.current.status).toBe('connecting')
    expect(mockEventSources).toHaveLength(1)
    expect(latestES().url).toBe('/api/events?subscribe=Notifications,Inquiries')

    act(() => {
      fireOpen(latestES())
    })

    expect(result.current.status).toBe('connected')
  })

  it('dispatches generic message events to type-matched subscribers', async () => {
    const useEventStream = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useEventStream(), { wrapper: Wrapper })

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
    const { result } = renderHook(() => useEventStream(), { wrapper: Wrapper })

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
    const { result } = renderHook(() => useEventStream(), { wrapper: Wrapper })

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
    const { result } = renderHook(() => useEventStream(), { wrapper: Wrapper })

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

    act(() => {
      fireMessage(latestES(), envelope)
    })
    expect(handler).toHaveBeenCalledTimes(1)

    act(() => {
      unsubscribe()
    })

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

      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })

      expect(mockEventSources).toHaveLength(1)

      act(() => {
        fireOpen(latestES())
      })
      expect(result.current.status).toBe('connected')

      act(() => {
        fireError(latestES())
      })
      expect(result.current.status).toBe('disconnected')
      expect(latestES().close).toHaveBeenCalled()

      expect(mockEventSources).toHaveLength(1)

      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(mockEventSources).toHaveLength(2)
      expect(result.current.status).toBe('reconnecting')

      act(() => {
        fireOpen(latestES())
      })
      expect(result.current.status).toBe('connected')

      act(() => {
        fireError(latestES())
      })
      expect(result.current.status).toBe('disconnected')

      // A successful connection resets backoff to 1s.
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

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      expect(mockEventSources).toHaveLength(1)

      act(() => {
        fireError(latestES())
      })

      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(mockEventSources).toHaveLength(2)

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

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      // The sixth retry reaches the 30s cap.
      for (let i = 0; i < 5; i++) {
        act(() => {
          fireError(latestES())
        })
        const delay = Math.min(1000 * Math.pow(2, i), 30000)
        act(() => {
          vi.advanceTimersByTime(delay)
        })
      }

      const countBefore = mockEventSources.length
      act(() => {
        fireError(latestES())
      })

      act(() => {
        vi.advanceTimersByTime(29999)
      })
      expect(mockEventSources).toHaveLength(countBefore)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(mockEventSources).toHaveLength(countBefore + 1)
    })
  })

  it('closes EventSource and clears timers on unmount', async () => {
    vi.useFakeTimers()
    const useEventStream = await importHook()

    const { result, unmount } = renderHook(() => useEventStream(), {
      wrapper: Wrapper,
    })

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

    const { unmount } = renderHook(() => useEventStream(), {
      wrapper: Wrapper,
    })

    act(() => {
      fireError(latestES())
    })

    const sourceCountBeforeUnmount = mockEventSources.length

    unmount()

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

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      expect(mockEventSources).toHaveLength(1)

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

      act(() => {
        fireError(latestES())
      })

      act(() => {
        vi.advanceTimersByTime(120000)
      })

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

      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })

      expect(result.current.status).toBe('connecting')
      const es = latestES()

      // Leave onopen unfired to simulate a hung connection.
      act(() => {
        vi.advanceTimersByTime(10000)
      })

      expect(es.close).toHaveBeenCalled()
      expect(
        result.current.status === 'reconnecting' ||
          result.current.status === 'disconnected',
      ).toBe(true)

      act(() => {
        vi.advanceTimersByTime(30000)
      })
      expect(mockEventSources.length).toBeGreaterThan(1)
    })
  })

  describe('visibility-aware reconnect', () => {
    let mockChannelInstances: Array<{
      name: string
      postMessage: ReturnType<typeof vi.fn>
      close: ReturnType<typeof vi.fn>
      onmessage: ((ev: MessageEvent) => void) | null
    }>

    beforeEach(() => {
      vi.useFakeTimers()
      // Visibility reconnect requires a leader; enable BroadcastChannel.
      mockChannelInstances = []
      const BCClass = vi.fn((name: string) => {
        const instance = {
          name,
          postMessage: vi.fn(),
          close: vi.fn(),
          onmessage: null as ((ev: MessageEvent) => void) | null,
        }
        mockChannelInstances.push(instance)
        return instance
      })
      vi.stubGlobal('BroadcastChannel', BCClass)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('reconnects immediately when tab becomes visible while disconnected', async () => {
      const useEventStream = await importHook()

      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })

      // Allow the 200ms leadership claim to finish.
      act(() => {
        vi.advanceTimersByTime(200)
      })

      act(() => {
        fireOpen(latestES())
      })
      act(() => {
        fireError(latestES())
      })
      expect(result.current.status).toBe('disconnected')

      const countBeforeVisible = mockEventSources.length

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(mockEventSources.length).toBeGreaterThan(countBeforeVisible)
    })

    it('resets attempts and reconnects when visible after max attempts reached', async () => {
      const useEventStream = await importHook()

      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })

      // Allow the 200ms leadership claim to finish.
      act(() => {
        vi.advanceTimersByTime(200)
      })

      for (let i = 0; i < 10; i++) {
        act(() => {
          fireError(latestES())
        })
        const delay = Math.min(1000 * Math.pow(2, i), 30000)
        act(() => {
          vi.advanceTimersByTime(delay)
        })
      }

      act(() => {
        fireError(latestES())
      })
      act(() => {
        vi.advanceTimersByTime(120000)
      })

      const countAtMax = mockEventSources.length

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

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

      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })

      act(() => {
        fireOpen(latestES())
      })
      expect(result.current.status).toBe('connected')

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

      act(() => {
        fireNamedEvent(latestES(), 'reconnect', {
          type: 'reconnect',
          module: 'system',
          payload: {},
          timestamp: '2026-03-25T00:00:00Z',
        })
      })

      // Server-requested reconnects use the 1s base delay.
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockEventSources.length).toBeGreaterThan(countBefore)
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

    it('broadcasts claim on mount', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      const channel = latestChannel()
      expect(channel).toBeDefined()
      expect(channel.postMessage).toHaveBeenCalledWith({ type: 'claim' })
    })

    it('only one EventSource is created when useEventStream is mounted — the tab becomes leader', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      expect(mockEventSources).toHaveLength(0)

      // Allow the 200ms leadership claim to finish.
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(mockEventSources).toHaveLength(1)
      expect(latestES().url).toBe(
        '/api/events?subscribe=Notifications,Inquiries',
      )
    })

    it('becomes follower when existing leader responds to claim', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      const channel = latestChannel()
      expect(channel).toBeDefined()

      act(() => {
        channel.onmessage!(
          new MessageEvent('message', {
            data: { type: 'already-leader' },
          }),
        )
      })

      // Allow the 200ms leadership claim to finish.
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(mockEventSources).toHaveLength(0)
    })

    it('a follower promotes itself to leader after 7s without heartbeat', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      const channel = latestChannel()
      expect(channel).toBeDefined()

      act(() => {
        channel.onmessage!(
          new MessageEvent('message', {
            data: { type: 'already-leader' },
          }),
        )
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(mockEventSources).toHaveLength(0)

      const countBefore = mockEventSources.length

      // Expire the leader heartbeat after 7s.
      act(() => {
        vi.advanceTimersByTime(7000)
      })

      // Allow the replacement leadership claim to finish.
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(mockEventSources.length).toBeGreaterThan(countBefore)
    })

    it('an event message on BroadcastChannel calls follower subscribers without an open EventSource', async () => {
      const useEventStream = await importHook()

      const handler = vi.fn()
      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })

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

      act(() => {
        channel.onmessage!(
          new MessageEvent('message', {
            data: { type: 'event', envelope },
          }),
        )
      })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(envelope)
    })

    it('follower promotes itself after receiving leader-resign message and timeout elapses', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      const channel = latestChannel()
      expect(channel).toBeDefined()
      expect(channel.onmessage).toBeTypeOf('function')

      act(() => {
        channel.onmessage!(
          new MessageEvent('message', {
            data: { type: 'already-leader' },
          }),
        )
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(mockEventSources).toHaveLength(0)

      const countBefore = mockEventSources.length

      // Resignation starts another 200ms claim round.
      act(() => {
        channel.onmessage!(
          new MessageEvent('message', {
            data: { type: 'leader-resign' },
          }),
        )
      })

      // Allow the 200ms leadership claim to finish.
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(mockEventSources.length).toBeGreaterThan(countBefore)
    })

    it('on leader unmount, postMessage is called with { type: "leader-resign" }', async () => {
      const useEventStream = await importHook()

      const { unmount } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })

      // Allow the 200ms leadership claim to finish.
      act(() => {
        vi.advanceTimersByTime(200)
      })

      act(() => {
        fireOpen(latestES())
      })

      const channel = latestChannel()
      expect(channel).toBeDefined()

      unmount()

      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'leader-resign',
      })
    })

    it('follower does not reconnect on visibility change', async () => {
      const useEventStream = await importHook()

      renderHook(() => useEventStream(), { wrapper: Wrapper })

      const channel = latestChannel()

      act(() => {
        channel.onmessage!(
          new MessageEvent('message', {
            data: { type: 'already-leader' },
          }),
        )
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      const countBefore = mockEventSources.length
      expect(countBefore).toBe(0)

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(mockEventSources.length).toBe(countBefore)
    })
  })

  it('ignores malformed message data gracefully', async () => {
    const useEventStream = await importHook()

    const handler = vi.fn()
    const { result } = renderHook(() => useEventStream(), { wrapper: Wrapper })

    act(() => {
      result.current.subscribe('Foo', handler)
    })

    act(() => {
      fireOpen(latestES())
    })

    act(() => {
      const event = new MessageEvent('message', { data: 'not json' })
      latestES().onmessage?.(event)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('using hook outside provider throws', async () => {
    const useEventStream = await importHook()

    expect(() => {
      renderHook(() => useEventStream())
    }).toThrow('useEventStream must be used within an EventStreamProvider')
  })
})
