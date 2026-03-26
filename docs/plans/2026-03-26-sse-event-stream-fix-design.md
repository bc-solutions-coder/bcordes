# SSE Event Stream Fix — Design

## Problem

The `useEventStream` hook has three compounding bugs that cause excessive connections to `/api/notifications/stream` and lost notifications:

1. **No shared state**: Every component calling `useEventStream()` creates its own `EventSource`, `BroadcastChannel`, timers, and reconnect logic. `NotificationBell` and `useEventStreamEvents` each open independent connections from the same tab.

2. **Broken leader election**: Every tab sets `isLeaderRef.current = true` immediately on mount and calls `connect()`. No actual election occurs — all tabs are "leaders" with their own connections.

3. **Stale visibility handler**: The `visibilitychange` handler captures `status` from the initial render closure (always `'disconnected'`), and `!mountedRef.current === false` evaluates to `true` due to operator precedence. Every tab-focus event triggers a new `EventSource` connection.

**Result**: N tabs x M consumers per tab = N*M simultaneous SSE connections. Notifications arriving during reconnection storms are lost because SSE has no replay mechanism.

## Design

### 1. EventStreamProvider Context

Extract connection management into an `EventStreamProvider` context component.

**New file**: `src/hooks/EventStreamProvider.tsx`
- Holds all connection, leader election, reconnect, and BroadcastChannel logic
- Exports `EventStreamProvider` component and `EventStreamContext`

**Modified file**: `src/hooks/useEventStream.ts`
- Reduced to `useContext(EventStreamContext)`
- Same public API: `{ status, subscribe }`
- No behavior change for consumers

**Modified file**: `src/routes/__root.tsx`
- Wraps children in `<EventStreamProvider>` inside `RootDocument`

All existing consumers (`NotificationBell`, `useEventStreamEvents`, inquiry pages) continue calling `useEventStream()` unchanged.

### 2. Leader Election — Claim/Challenge Protocol

Replace the broken "everyone is leader" pattern with a proper claim/challenge protocol over `BroadcastChannel`:

1. **New tab mounts** — broadcasts `{ type: 'claim', tabId }` and waits 200ms
2. **Existing leader receives claim** — responds with `{ type: 'already-leader' }` and sends a heartbeat
3. **After 200ms**:
   - If `already-leader` was received: become follower (no `EventSource`, receive events relayed via BroadcastChannel)
   - If no response: become leader, call `connect()`, start heartbeat interval (5s)
4. **Leader failover** — if a follower doesn't receive a heartbeat within 7s, it promotes itself via a new claim round
5. **Leader unmounts** — broadcasts `{ type: 'leader-resign' }`, followers compete via new claim round
6. **Event relay** — leader broadcasts `{ type: 'event', envelope }` on every SSE message; followers dispatch to their local subscribers

No changes to the server-side stream. BroadcastChannel name stays `'sse-leader'`.

### 3. Visibility Handler Fix

Two bugs, two fixes:

- `!mountedRef.current === false` → `mountedRef.current` (fix operator precedence)
- `status === 'disconnected'` → `!connectedRef.current` (use ref instead of stale closure)
- Only reconnect if this tab is the leader — followers should not open their own connections on focus

```ts
if (document.visibilityState === 'visible' && mountedRef.current) {
  if (isLeaderRef.current && !connectedRef.current) {
    reconnectAttemptRef.current = 0
    connect()
  }
}
```

### 4. Testing Strategy

Update existing `useEventStream.test.ts` in place (no new test file):

- **Context wrapper**: All `renderHook(() => useEventStream())` calls wrapped in `<EventStreamProvider>`
- **Claim/challenge**: Tests simulate the 200ms claim window using existing fake timers
- **Follower tests**: Verify that a tab receiving `already-leader` does NOT create an `EventSource`
- **Visibility fix**: Assert no reconnect when already connected

`useEventStreamEvents.test.ts` should not need changes since the `subscribe` API is unchanged.

### 5. Edge Cases

| Scenario | Behavior |
|---|---|
| All tabs close simultaneously | Next fresh tab becomes leader after claim timeout |
| BroadcastChannel unavailable | Falls back to direct connect, no election (same as current fallback) |
| Leader upstream returns 401 | Exponential backoff reconnect up to 10 attempts, scoped to leader only |
| Split-brain (two leaders briefly) | Self-healing — next heartbeat round resolves; backend handles multiple connections |
| React strict mode double-mount | Cleanup resigns leadership, second mount runs fresh claim |

## Files Changed

| File | Change |
|---|---|
| `src/hooks/EventStreamProvider.tsx` | **New** — context provider with connection + leader election logic |
| `src/hooks/useEventStream.ts` | Reduce to `useContext` wrapper, same public API |
| `src/routes/__root.tsx` | Wrap in `<EventStreamProvider>` |
| `src/hooks/useEventStream.test.ts` | Update tests for context wrapper + claim/challenge |
