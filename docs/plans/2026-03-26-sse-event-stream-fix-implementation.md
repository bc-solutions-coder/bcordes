# SSE Event Stream Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three compounding bugs in `useEventStream` — no shared state, broken leader election, and stale visibility handler — so that only one SSE connection exists per browser (across tabs) and notifications are reliably delivered.

**Architecture:** Extract connection management into an `EventStreamProvider` React context (mounted once in `__root.tsx`). Implement a claim/challenge leader election over `BroadcastChannel`. Fix the visibility handler to use refs instead of stale closures.

**Tech Stack:** React context, BroadcastChannel API, EventSource, Vitest + @testing-library/react

---

### Task 1: Create EventStreamProvider with Claim/Challenge Leader Election

**Files:**
- Create: `src/hooks/EventStreamProvider.tsx`

**Step 1: Write the provider skeleton**

Create `src/hooks/EventStreamProvider.tsx` with a React context that exposes `{ status, subscribe }`. Move all connection logic from `useEventStream.ts` into this provider, with these changes:

```tsx
import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { RealtimeEnvelope } from '@/lib/wallow/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
type Handler = (envelope: RealtimeEnvelope) => void

export interface EventStreamContextValue {
  status: ConnectionStatus
  subscribe: (method: string, handler: Handler) => () => void
}

export const EventStreamContext = createContext<EventStreamContextValue | null>(null)

const MAX_ATTEMPTS = 10
const CONNECTION_TIMEOUT_MS = 10_000
const HEARTBEAT_INTERVAL_MS = 5_000
const LEADER_TIMEOUT_MS = 7_000
const CLAIM_WAIT_MS = 200
const BC_CHANNEL_NAME = 'sse-leader'

export function EventStreamProvider({ children }: { children: ReactNode }) {
  // ... all connection, leader election, and reconnect logic here
}
```

**Key changes from the current `useEventStream` hook:**

**Leader election — claim/challenge protocol:**
```tsx
// Inside the useEffect:
if (hasBroadcastChannel) {
  const bc = new BroadcastChannel(BC_CHANNEL_NAME)
  bcRef.current = bc

  // Start as undecided — broadcast a claim and wait
  isLeaderRef.current = false

  bc.postMessage({ type: 'claim' })

  // Wait CLAIM_WAIT_MS for an existing leader to respond
  claimTimerRef.current = setTimeout(() => {
    if (!mountedRef.current) return
    // No leader responded — become leader
    isLeaderRef.current = true
    connect()
    startHeartbeat()
  }, CLAIM_WAIT_MS)

  bc.onmessage = (event: MessageEvent) => {
    const data = event.data
    if (data.type === 'claim') {
      // Another tab is claiming — if we're leader, respond
      if (isLeaderRef.current) {
        bc.postMessage({ type: 'already-leader' })
        bc.postMessage({ type: 'heartbeat' })
      }
    } else if (data.type === 'already-leader') {
      // A leader exists — cancel our claim, become follower
      if (claimTimerRef.current) {
        clearTimeout(claimTimerRef.current)
        claimTimerRef.current = null
      }
      isLeaderRef.current = false
      resetLeaderTimeout()
    } else if (data.type === 'heartbeat') {
      resetLeaderTimeout()
    } else if (data.type === 'event') {
      // Follower receives relayed events from leader
      dispatchEnvelope(data.envelope)
    } else if (data.type === 'leader-resign') {
      // Leader left — start a new claim round
      if (!isLeaderRef.current) {
        bc.postMessage({ type: 'claim' })
        claimTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          isLeaderRef.current = true
          reconnectAttemptRef.current = 0
          connect()
          startHeartbeat()
        }, CLAIM_WAIT_MS)
      }
    }
  }
} else {
  // No BroadcastChannel — direct connect
  connect()
}
```

**Heartbeat as a separate function:**
```tsx
function startHeartbeat() {
  if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
  heartbeatTimerRef.current = setInterval(() => {
    if (isLeaderRef.current && bcRef.current) {
      bcRef.current.postMessage({ type: 'heartbeat' })
    }
  }, HEARTBEAT_INTERVAL_MS)
}
```

**Leader timeout promotes via claim round (not direct promotion):**
```tsx
const resetLeaderTimeout = () => {
  if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current)
  leaderTimeoutRef.current = setTimeout(() => {
    if (!mountedRef.current || isLeaderRef.current) return
    // No heartbeat — start a claim round
    if (bcRef.current) {
      bcRef.current.postMessage({ type: 'claim' })
      claimTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        isLeaderRef.current = true
        reconnectAttemptRef.current = 0
        connect()
        startHeartbeat()
      }, CLAIM_WAIT_MS)
    }
  }, LEADER_TIMEOUT_MS)
}
```

**Visibility handler fix:**
```tsx
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && mountedRef.current) {
    if (isLeaderRef.current && !connectedRef.current) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      reconnectAttemptRef.current = 0
      connect()
    }
  }
}
```

**Cleanup adds claim timer and resign triggers a new claim round:**
```tsx
return () => {
  mountedRef.current = false
  if (claimTimerRef.current) clearTimeout(claimTimerRef.current)
  if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
  if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current)
  if (eventSourceRef.current) eventSourceRef.current.close()
  if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
  if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current)
  if (bcRef.current) {
    bcRef.current.postMessage({ type: 'leader-resign' })
    bcRef.current.close()
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
}
```

The `connect()`, `scheduleReconnect()`, `subscribe()`, and `dispatchEnvelope()` functions remain the same as current `useEventStream.ts`. The `connect()` function's EventSource setup (named event listeners, reconnect event, keepalive) is unchanged.

The provider returns:
```tsx
return (
  <EventStreamContext.Provider value={{ status, subscribe }}>
    {children}
  </EventStreamContext.Provider>
)
```

Add a `claimTimerRef`:
```tsx
const claimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

**Step 2: Verify the file compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No errors related to `EventStreamProvider.tsx`

**Step 3: Commit**

```bash
git add src/hooks/EventStreamProvider.tsx
git commit -m "feat: add EventStreamProvider with claim/challenge leader election"
```

---

### Task 2: Rewire useEventStream as Context Consumer

**Files:**
- Modify: `src/hooks/useEventStream.ts`

**Step 1: Replace the hook body with context consumer**

Replace the entire contents of `src/hooks/useEventStream.ts` with:

```ts
import { useContext } from 'react'
import { EventStreamContext } from './EventStreamProvider'
import type { EventStreamContextValue } from './EventStreamProvider'

export function useEventStream(): EventStreamContextValue {
  const context = useContext(EventStreamContext)
  if (!context) {
    throw new Error('useEventStream must be used within an EventStreamProvider')
  }
  return context
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useEventStream.ts
git commit -m "refactor: reduce useEventStream to context consumer"
```

---

### Task 3: Mount EventStreamProvider in Root Layout

**Files:**
- Modify: `src/routes/__root.tsx`

**Step 1: Add the provider to RootDocument**

In `src/routes/__root.tsx`, import `EventStreamProvider` and wrap the body content:

```tsx
import { EventStreamProvider } from '@/hooks/EventStreamProvider'

// In RootDocument:
function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    reportWebVitals()
  }, [])

  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <head>
        <HeadContent />
      </head>
      <body style={{ margin: 0 }}>
        <EventStreamProvider>
          <LoadingOverlay />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster position="bottom-right" />
          {import.meta.env.DEV && <DevTools />}
        </EventStreamProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

Note: `<Scripts />` stays outside the provider since it doesn't need event stream access.

**Step 2: Verify the dev server starts**

Run: `pnpm dev` and verify no console errors on load.

**Step 3: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: mount EventStreamProvider in root layout"
```

---

### Task 4: Update useEventStream Tests for Context + Claim/Challenge

**Files:**
- Modify: `src/hooks/useEventStream.test.ts`

**Step 1: Add a test wrapper that provides the context**

All `renderHook` calls need to be wrapped in `EventStreamProvider`. Add a helper at the top of the test file:

```tsx
import { EventStreamProvider } from './EventStreamProvider'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <EventStreamProvider>{children}</EventStreamProvider>
}
```

Update `importHook`:
```ts
async function importHook() {
  const mod = await import('./useEventStream')
  return mod.useEventStream
}
```

Replace all `renderHook(() => useEventStream())` with `renderHook(() => useEventStream(), { wrapper: Wrapper })`.

**Step 2: Update leader election tests for claim/challenge**

The test "only one EventSource is created when useEventStream is mounted" needs to account for the 200ms claim wait when BroadcastChannel is available:

```tsx
it('becomes leader after claim timeout when no other leader responds', async () => {
  const useEventStream = await importHook()

  renderHook(() => useEventStream(), { wrapper: Wrapper })

  // Claim was broadcast
  const channel = latestChannel()
  expect(channel.postMessage).toHaveBeenCalledWith({ type: 'claim' })

  // No EventSource yet — waiting for claim response
  expect(mockEventSources).toHaveLength(0)

  // Advance past CLAIM_WAIT_MS (200ms)
  act(() => {
    vi.advanceTimersByTime(200)
  })

  // Now it should have created an EventSource as leader
  expect(mockEventSources).toHaveLength(1)
  expect(latestES().url).toBe('/api/notifications/stream')
})
```

Add a new test for follower behavior:

```tsx
it('becomes follower when existing leader responds to claim', async () => {
  const useEventStream = await importHook()

  renderHook(() => useEventStream(), { wrapper: Wrapper })

  const channel = latestChannel()
  expect(channel.postMessage).toHaveBeenCalledWith({ type: 'claim' })

  // Simulate existing leader responding
  act(() => {
    channel.onmessage!(
      new MessageEvent('message', {
        data: { type: 'already-leader' },
      }),
    )
  })

  // Advance past claim wait
  act(() => {
    vi.advanceTimersByTime(200)
  })

  // Should NOT have created an EventSource — this tab is a follower
  expect(mockEventSources).toHaveLength(0)
})
```

**Step 3: Update visibility tests**

The "reconnects immediately when tab becomes visible while disconnected" test should verify that only leaders reconnect. For non-BroadcastChannel tests, the behavior is unchanged (direct connect, no election). For BroadcastChannel tests, add:

```tsx
it('does not reconnect on visibility change if tab is a follower', async () => {
  const useEventStream = await importHook()

  renderHook(() => useEventStream(), { wrapper: Wrapper })

  const channel = latestChannel()

  // Become follower
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

  // Simulate tab becoming visible
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    writable: true,
    configurable: true,
  })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })

  // Follower should NOT create a new EventSource
  expect(mockEventSources).toHaveLength(countBefore)
})
```

**Step 4: Update non-BroadcastChannel tests**

For tests that don't stub `BroadcastChannel` (the basic connection, subscribe, backoff tests), ensure `BroadcastChannel` is explicitly undefined so the provider falls back to direct connect:

```tsx
// In beforeEach for non-BC tests:
vi.stubGlobal('BroadcastChannel', undefined)
```

This ensures those tests exercise the no-election fallback path where `connect()` is called immediately on mount (no claim wait).

**Step 5: Run the full test suite**

Run: `pnpm vitest run src/hooks/useEventStream.test.ts`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/hooks/useEventStream.test.ts
git commit -m "test: update useEventStream tests for context provider and claim/challenge"
```

---

### Task 5: Verify useEventStreamEvents Tests Still Pass

**Files:**
- Modify: `src/hooks/useEventStreamEvents.test.ts` (if needed)

**Step 1: Run the tests**

Run: `pnpm vitest run src/hooks/useEventStreamEvents.test.ts`
Expected: All pass. These tests mock `useEventStream` so they should be unaffected.

If they fail because the mock doesn't account for the context, update the mock to return `{ status: 'connected', subscribe: mockSubscribe }` as before.

**Step 2: Run the full project test suite**

Run: `pnpm vitest run`
Expected: All tests pass

**Step 3: Commit (only if changes were needed)**

```bash
git add src/hooks/useEventStreamEvents.test.ts
git commit -m "test: fix useEventStreamEvents tests for provider wrapper"
```

---

### Task 6: Verify Lint and TypeCheck

**Files:** None (validation only)

**Step 1: Run TypeScript check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 3: Run format**

Run: `pnpm format`
Expected: Clean

---

### Task 7: Manual Smoke Test

**Step 1: Start dev server**

Run: `pnpm dev`

**Step 2: Verify single connection**

Open browser DevTools Network tab, filter for `stream`. Log in and confirm only ONE SSE connection is open. Open a second tab — confirm no additional SSE connection is created (the second tab should be a follower).

**Step 3: Verify leader failover**

Close the first tab (leader). Observe the second tab's console — after ~7.2s (LEADER_TIMEOUT_MS + CLAIM_WAIT_MS) it should promote itself and open a new SSE connection.

**Step 4: Verify visibility handler**

With a single tab connected, switch to another app and back. Confirm NO new SSE connection is created (since the existing one is still connected).

**Step 5: Verify notification delivery**

Trigger a notification from the backend. Confirm the toast appears and the bell count increments.
