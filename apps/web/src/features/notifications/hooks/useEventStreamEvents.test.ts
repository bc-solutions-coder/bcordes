import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMockUser } from '@bcordes/auth/testing'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { DashboardEventSource } from '../../../../testing/dashboard-browser'
import { EventStreamProvider } from './EventStreamProvider'
import { useEventStreamEvents } from './useEventStreamEvents'
import type { RealtimeEnvelope } from '@bcordes/wallow/types'

type Handlers = Parameters<typeof useEventStreamEvents>[0]
function Consumer({ handlers }: { handlers: Handlers }) {
  useEventStreamEvents(handlers)
  return null
}
function fixture(primary: Handlers, surviving: Handlers = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(['auth', 'user'], createMockUser())
  function view(showPrimary: boolean) {
    return createElement(
      QueryClientProvider,
      { client },
      createElement(EventStreamProvider, {
        children: [
          showPrimary
            ? createElement(Consumer, { key: 'primary', handlers: primary })
            : null,
          createElement(Consumer, { key: 'survivor', handlers: surviving }),
        ],
      }),
    )
  }
  const result = render(view(true))
  return { ...result, removePrimary: () => result.rerender(view(false)) }
}
function deliver(type: string, content: string) {
  const envelope = {
    type,
    module: 'Notifications',
    payload: { content },
    timestamp: '2026-01-01T00:00:00Z',
  }
  act(() =>
    DashboardEventSource.instances[0].dispatchEvent(
      new MessageEvent(type, { data: JSON.stringify(envelope) }),
    ),
  )
  return envelope
}
beforeEach(() => {
  DashboardEventSource.instances = []
  vi.stubGlobal('EventSource', DashboardEventSource)
  vi.stubGlobal('BroadcastChannel', undefined)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it.each([['NotificationCreated', 'TaskAssigned'], ['SystemAlert']])(
  'delivers only subscribed stream types %j with their exact payloads',
  (...types) => {
    const callbacks = types.map(() =>
      vi.fn<(event: RealtimeEnvelope) => void>(),
    )
    fixture(
      Object.fromEntries(types.map((type, index) => [type, callbacks[index]])),
    )
    const expected = types.map((type) => deliver(type, `payload for ${type}`))
    deliver('Announcement', 'unrelated payload')
    callbacks.forEach((callback, index) =>
      expect(callback.mock.calls).toEqual([[expected[index]]]),
    )
  },
)

it('stops delivery to an unmounted consumer while a surviving subscriber still receives both event types', () => {
  const removed = vi.fn<(event: RealtimeEnvelope) => void>()
  const surviving = vi.fn<(event: RealtimeEnvelope) => void>()
  const { removePrimary } = fixture(
    { NotificationCreated: removed, TaskAssigned: removed },
    { NotificationCreated: surviving, TaskAssigned: surviving },
  )
  const first = deliver('NotificationCreated', 'before removal')
  const second = deliver('TaskAssigned', 'before removal')
  expect(removed.mock.calls).toEqual([[first], [second]])
  removePrimary()
  const third = deliver('NotificationCreated', 'after removal')
  const fourth = deliver('TaskAssigned', 'after removal')
  expect(removed.mock.calls).toEqual([[first], [second]])
  expect(surviving.mock.calls).toEqual([[first], [second], [third], [fourth]])
})

it('allows an empty subscription map to mount and unmount without disrupting an active consumer', () => {
  const surviving = vi.fn<(event: RealtimeEnvelope) => void>()
  const { removePrimary } = fixture({}, { SystemAlert: surviving })
  const first = deliver('SystemAlert', 'before empty consumer removal')
  removePrimary()
  const second = deliver('SystemAlert', 'after empty consumer removal')
  expect(surviving.mock.calls).toEqual([[first], [second]])
})
