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

let mockUser: { id: string; name: string; tenantId?: string } | null = {
  id: 'test-user',
  name: 'Test',
}
vi.mock('@/shared/auth', () => ({
  useUser: () => ({ user: mockUser, isLoading: false }),
}))

beforeEach(() => {
  mockUser = { id: 'test-user', name: 'Test' }
  mockEventSources = []
  vi.stubGlobal(
    'EventSource',
    vi.fn(function (url: string) {
      return createMockEventSource(url)
    }),
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

  it('stays disconnected without a signed-in customer', async () => {
    mockUser = null
    const useEventStream = await importHook()
    const { result } = renderHook(() => useEventStream(), { wrapper: Wrapper })
    expect(result.current.status).toBe('disconnected')
    expect(mockEventSources).toHaveLength(0)
  })

  it('clears private notification data and closes the stream when the customer signs out', async () => {
    const useEventStream = await importHook()
    const EventStreamProvider = await importProvider()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(EventStreamProvider, null, children),
      )
    const { result, rerender } = renderHook(() => useEventStream(), { wrapper })
    const connection = latestES()
    client.setQueryData(['notifications'], [{ id: 'private-notification' }])
    client.setQueryData(['notification-settings'], { private: true })
    mockUser = null
    rerender()
    expect(result.current.status).toBe('disconnected')
    expect(connection.close).toHaveBeenCalledOnce()
    expect(client.getQueryData(['notifications'])).toBeUndefined()
    expect(client.getQueryData(['notification-settings'])).toBeUndefined()
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

  it('stops delivering events after unsubscribe', async () => {
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

    it('retries after one second and resets the retry delay after a successful connection', async () => {
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

  it('closes the open event stream when its provider unmounts', async () => {
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

    it('stops after the initial connection and ten unopened retries', async () => {
      const useEventStream = await importHook()
      renderHook(() => useEventStream(), { wrapper: Wrapper })
      expect(mockEventSources).toHaveLength(1)
      for (const [index, delay] of [
        1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000,
      ].entries()) {
        act(() => fireError(latestES()))
        act(() => vi.advanceTimersByTime(delay - 1))
        expect(mockEventSources).toHaveLength(index + 1)
        act(() => vi.advanceTimersByTime(1))
        expect(mockEventSources).toHaveLength(index + 2)
      }
      act(() => fireError(latestES()))
      act(() => vi.advanceTimersByTime(120000))
      expect(mockEventSources).toHaveLength(11)
    })
  })

  describe('connection timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('closes an unopened stream at ten seconds and starts its retry one second later', async () => {
      const useEventStream = await importHook()
      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })
      const es = latestES()
      act(() => vi.advanceTimersByTime(9999))
      expect(es.close).not.toHaveBeenCalled()
      expect(mockEventSources).toHaveLength(1)
      expect(result.current.status).toBe('connecting')
      act(() => vi.advanceTimersByTime(1))
      expect(es.close).toHaveBeenCalledOnce()
      expect(result.current.status).toBe('disconnected')
      act(() => vi.advanceTimersByTime(999))
      expect(mockEventSources).toHaveLength(1)
      act(() => vi.advanceTimersByTime(1))
      expect(mockEventSources).toHaveLength(2)
      expect(result.current.status).toBe('reconnecting')
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
      const BCClass = vi.fn(function (name: string) {
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

    it('reconnects a disconnected leader on visibility and cancels its old scheduled retry', async () => {
      const useEventStream = await importHook()
      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })
      act(() => vi.advanceTimersByTime(200))
      act(() => fireOpen(latestES()))
      act(() => fireError(latestES()))
      expect(result.current.status).toBe('disconnected')
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
      act(() => document.dispatchEvent(new Event('visibilitychange')))
      expect(mockEventSources).toHaveLength(2)
      act(() => fireOpen(latestES()))
      act(() => vi.advanceTimersByTime(1000))
      expect(mockEventSources).toHaveLength(2)
      expect(result.current.status).toBe('connected')
    })

    it('visibility restores a fresh retry budget after all ten retries are exhausted', async () => {
      const useEventStream = await importHook()
      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })
      act(() => vi.advanceTimersByTime(200))
      for (const delay of [
        1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000,
      ]) {
        act(() => fireError(latestES()))
        act(() => vi.advanceTimersByTime(delay))
      }
      expect(mockEventSources).toHaveLength(11)
      act(() => fireError(latestES()))
      act(() => vi.advanceTimersByTime(120000))
      expect(mockEventSources).toHaveLength(11)
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
      act(() => document.dispatchEvent(new Event('visibilitychange')))
      expect(mockEventSources).toHaveLength(12)
      expect(result.current.status).toBe('connecting')
      act(() => fireError(latestES()))
      act(() => vi.advanceTimersByTime(999))
      expect(mockEventSources).toHaveLength(12)
      act(() => vi.advanceTimersByTime(1))
      expect(mockEventSources).toHaveLength(13)
    })
  })

  describe('reconnect SSE event', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('a server reconnect request resets an unopened retry to the one-second delay', async () => {
      const useEventStream = await importHook()
      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })
      act(() => fireError(latestES()))
      act(() => vi.advanceTimersByTime(1000))
      act(() => fireError(latestES()))
      act(() => vi.advanceTimersByTime(2000))
      expect(mockEventSources).toHaveLength(3)
      const source = latestES()
      act(() =>
        fireNamedEvent(source, 'reconnect', {
          type: 'reconnect',
          module: 'system',
          payload: {},
        }),
      )
      expect(source.close).toHaveBeenCalledOnce()
      act(() => vi.advanceTimersByTime(999))
      expect(mockEventSources).toHaveLength(3)
      act(() => vi.advanceTimersByTime(1))
      expect(mockEventSources).toHaveLength(4)
      expect(result.current.status).toBe('connecting')
      act(() => fireError(latestES()))
      act(() => vi.advanceTimersByTime(999))
      expect(mockEventSources).toHaveLength(4)
      act(() => vi.advanceTimersByTime(1))
      expect(mockEventSources).toHaveLength(5)
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
      MockBroadcastChannelClass = vi.fn(function (name: string) {
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

    function connectBrowserChannels() {
      const channels = new Set<Channel>()
      class Channel {
        onmessage: ((event: MessageEvent) => void) | null = null
        constructor(readonly name: string) {
          channels.add(this)
        }
        postMessage(data: unknown) {
          for (const peer of channels) {
            if (peer !== this && peer.name === this.name) {
              queueMicrotask(() => {
                if (channels.has(peer))
                  peer.onmessage?.(new MessageEvent('message', { data }))
              })
            }
          }
        }
        close() {
          channels.delete(this)
        }
      }
      vi.stubGlobal('BroadcastChannel', Channel)
    }

    it('relays named and generic events from the leader to other tabs and local subscribers', async () => {
      const useEventStream = await importHook()
      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })
      const handler = vi.fn()
      act(() => {
        result.current.subscribe('NotificationCreated', handler)
        vi.advanceTimersByTime(200)
      })
      const envelope = {
        type: 'NotificationCreated',
        module: 'Notifications',
        payload: { id: 'new-notification' },
        timestamp: '2026-09-07T00:00:00Z',
      }
      act(() => {
        fireOpen(latestES())
        fireMessage(latestES(), envelope)
        fireNamedEvent(latestES(), 'NotificationCreated', envelope)
      })
      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenLastCalledWith(envelope)
      expect(
        latestChannel().postMessage.mock.calls.filter(
          ([message]) => message.type === 'event',
        ),
      ).toEqual([[{ type: 'event', envelope }], [{ type: 'event', envelope }]])
    })

    it('keeps a follower disconnected while the leader continues sending heartbeats', async () => {
      const useEventStream = await importHook()
      renderHook(() => useEventStream(), { wrapper: Wrapper })
      const channel = latestChannel()
      act(() => {
        channel.onmessage?.(
          new MessageEvent('message', { data: { type: 'already-leader' } }),
        )
      })
      for (let heartbeat = 0; heartbeat < 3; heartbeat++) {
        act(() => {
          vi.advanceTimersByTime(5000)
          channel.onmessage?.(
            new MessageEvent('message', { data: { type: 'heartbeat' } }),
          )
        })
      }
      expect(mockEventSources).toHaveLength(0)
      act(() => vi.advanceTimersByTime(7200))
      expect(mockEventSources).toHaveLength(1)
    })

    it('answers competing claims and ignores relayed duplicates while acting as leader', async () => {
      const useEventStream = await importHook()
      const { result } = renderHook(() => useEventStream(), {
        wrapper: Wrapper,
      })
      const handler = vi.fn()
      act(() => {
        result.current.subscribe('NotificationCreated', handler)
        vi.advanceTimersByTime(200)
      })
      const channel = latestChannel()
      act(() => {
        channel.onmessage?.(
          new MessageEvent('message', { data: { type: 'claim' } }),
        )
        channel.onmessage?.(
          new MessageEvent('message', { data: { type: 'heartbeat' } }),
        )
        channel.onmessage?.(
          new MessageEvent('message', {
            data: {
              type: 'event',
              envelope: {
                type: 'NotificationCreated',
                payload: { id: 'duplicate' },
              },
            },
          }),
        )
      })
      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'already-leader',
      })
      expect(channel.postMessage).toHaveBeenCalledWith({ type: 'heartbeat' })
      expect(handler).not.toHaveBeenCalled()
      expect(mockEventSources).toHaveLength(1)
    })

    it('two mounted providers share one leader stream and deliver relayed events to the follower', async () => {
      connectBrowserChannels()
      const useEventStream = await importHook()
      const leader = renderHook(() => useEventStream(), { wrapper: Wrapper })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      expect(mockEventSources).toHaveLength(1)
      act(() => fireOpen(latestES()))
      const follower = renderHook(() => useEventStream(), { wrapper: Wrapper })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      expect(mockEventSources).toHaveLength(1)
      const delivered = vi.fn()
      act(() => {
        follower.result.current.subscribe('NotificationCreated', delivered)
      })
      const envelope = {
        type: 'NotificationCreated',
        module: 'Notifications',
        payload: { id: 'relayed' },
      }
      await act(async () => {
        fireNamedEvent(latestES(), 'NotificationCreated', envelope)
        await Promise.resolve()
      })
      expect(delivered.mock.calls).toEqual([[envelope]])
      expect(leader.result.current.status).toBe('connected')
      expect(follower.result.current.status).toBe('disconnected')
    })

    it('opens one stream after the leadership claim window when no leader responds', async () => {
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

    it('a follower waits seven seconds after the latest heartbeat before claiming leadership', async () => {
      const useEventStream = await importHook()
      renderHook(() => useEventStream(), { wrapper: Wrapper })
      const channel = latestChannel()
      act(() =>
        channel.onmessage?.(
          new MessageEvent('message', { data: { type: 'already-leader' } }),
        ),
      )
      act(() => vi.advanceTimersByTime(3000))
      act(() =>
        channel.onmessage?.(
          new MessageEvent('message', { data: { type: 'heartbeat' } }),
        ),
      )
      act(() => vi.advanceTimersByTime(6999))
      expect(mockEventSources).toHaveLength(0)
      act(() => vi.advanceTimersByTime(1))
      expect(mockEventSources).toHaveLength(0)
      act(() => vi.advanceTimersByTime(199))
      expect(mockEventSources).toHaveLength(0)
      act(() => vi.advanceTimersByTime(1))
      expect(mockEventSources).toHaveLength(1)
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

      act(() =>
        channel.onmessage?.(
          new MessageEvent('message', { data: { type: 'already-leader' } }),
        ),
      )
      act(() => vi.advanceTimersByTime(200))
      expect(mockEventSources).toHaveLength(0)

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
      expect(mockEventSources).toHaveLength(0)
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

      act(() => vi.advanceTimersByTime(199))
      expect(mockEventSources).toHaveLength(countBefore)
      act(() => vi.advanceTimersByTime(1))
      expect(mockEventSources).toHaveLength(countBefore + 1)
    })

    it('a surviving follower takes over promptly when the real leader provider unmounts', async () => {
      connectBrowserChannels()
      const useEventStream = await importHook()
      const leader = renderHook(() => useEventStream(), { wrapper: Wrapper })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      const source = latestES()
      act(() => fireOpen(source))
      const follower = renderHook(() => useEventStream(), { wrapper: Wrapper })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      expect(mockEventSources).toHaveLength(1)
      await act(async () => {
        leader.unmount()
        await Promise.resolve()
      })
      expect(source.close).toHaveBeenCalledOnce()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(199)
      })
      expect(mockEventSources).toHaveLength(1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(mockEventSources).toHaveLength(2)
      act(() => fireOpen(latestES()))
      expect(follower.result.current.status).toBe('connected')
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

      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(mockEventSources.length).toBe(countBefore)
    })
  })

  it('removes one subscriber without disturbing another and allows repeated unsubscribe', async () => {
    const useEventStream = await importHook()
    const { result } = renderHook(() => useEventStream(), { wrapper: Wrapper })
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = result.current.subscribe('Announcement', first)
    const unsubscribeSecond = result.current.subscribe('Announcement', second)
    unsubscribeFirst()
    const envelope = {
      type: 'Announcement',
      module: 'Notifications',
      payload: { title: 'news' },
      timestamp: '2026-09-07T00:00:00Z',
    }
    act(() => {
      fireMessage(latestES(), {})
      fireMessage(latestES(), envelope)
    })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledExactlyOnceWith(envelope)
    unsubscribeSecond()
    unsubscribeSecond()
    act(() => fireMessage(latestES(), envelope))
    expect(second).toHaveBeenCalledOnce()
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
    const envelope = {
      type: 'Foo',
      module: 'system',
      payload: { value: 'valid after malformed' },
    }
    act(() => fireMessage(latestES(), envelope))
    expect(handler.mock.calls).toEqual([[envelope]])
  })

  it('using hook outside provider throws', async () => {
    const useEventStream = await importHook()

    expect(() => {
      renderHook(() => useEventStream())
    }).toThrow('useEventStream must be used within an EventStreamProvider')
  })
})
