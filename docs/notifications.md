# Notifications and live updates

The application reads notifications through authenticated server functions and uses SSE to refresh open views. Start with [notification server functions](../apps/web/src/features/notifications/server-fns/notifications.ts) for API operations and [`EventStreamProvider`](../apps/web/src/features/notifications/hooks/EventStreamProvider.tsx) for connection behavior.

## Read and update notifications

`fetchNotifications()` requests page 1 with 20 items and returns its items. Filters use only that array. The current load-more control increments local page state but does not request subsequent API pages. The bell displays its first five items and fetches the unread count separately.

Mark-one and mark-all operations require authentication. After either succeeds, call `invalidateNotifications(queryClient)` to refresh the list and unread count. The bell also polls both queries every minute.

Settings reads map API `channelSettings` into `{ channelType, isEnabled }` values. Writes call the generated channel-setting operation. These adapters exist, but deployed preference behavior remains part of [Wallow verification](https://github.com/bc-solutions-coder/bcordes/issues/31).

Use [`getNotificationRoute()`](../apps/web/src/features/notifications/lib/routing.ts) for notification links. It prefers a qualifying relative `actionUrl`, then maps known types and valid entity UUIDs, with `/dashboard/notifications` as the fallback. Task and billing mappings do not establish that those destinations are implemented.

## Subscribe to events

Use `useEventStream()` or `useEventStreamEvents()` from `@/features/notifications` beneath `EventStreamProvider`. Subscribe by envelope `type` and unsubscribe when the consumer unmounts. The convenience hook registers handlers when its subscription effect runs; it does not refresh handlers when only their captured values change. For changing dependencies, use `subscribe` in an effect with those dependencies and return its cleanup.

The provider opens `/api/events?subscribe=Notifications,Inquiries` only for an authenticated user. [Host middleware](../apps/web/src/start.ts) rejects other event query shapes. The local envelope contains `type`, `module`, `payload`, `timestamp`, and optional `correlationId`; its payload is `unknown`.

Current consumers use events to refresh authoritative API data:

- `NotificationCreated` refreshes notification queries. The bell also bumps the count while the refetch is pending and shows a toast in a visible tab.
- Inquiry routes listen for their inquiry events and `Resync`, then invalidate router loaders.
- A new connection refreshes notifications and emits a local inquiry `Resync`. Returning to a visible tab does the same. A one-minute timer emits inquiry `Resync` events.

For a new event type, add a consumer and, if the server sends named SSE events, register its name in the provider's `knownTypes`. Default SSE messages dispatch by the JSON envelope's `type`. Verify the actual backend payload before relying on fields; parsing JSON does not validate its shape.

## Connection behavior and limits

The provider tries to share a connection across tabs with a `BroadcastChannel` scoped by tenant and user. A leader relays events and sends heartbeats; followers attempt leadership after a timeout or resignation. Without `BroadcastChannel`, each tab connects directly. This is coordination logic, not a guarantee of exactly one connection or exactly-once event delivery.

Connection errors trigger exponential retries, starting at one second and capped at 30 seconds, for up to ten attempts. Opening a connection resets the attempt counter. A valid named `reconnect` message schedules a fresh connection after one second. Refetches recover current view data; the client does not implement an event replay cursor.

An identity change clears notification and notification-settings queries. Keep channel scoping, subscription cleanup, and data refresh behavior intact when changing the provider. The existing [provider tests](../apps/web/src/features/notifications/hooks/useEventStream.test.ts) cover local connection behavior; use [testing](testing.md) for commands.

## Browser push is pending

The browser hook and service worker exist, but every push server function authenticates and throws an explicit pending-contract error. Device listing, registration, deregistration, VAPID lookup, and test delivery are not operational features.

Do not invent subscription serialization or substitute a privileged service client. Browser push, inquiry SSE permissions, preference behavior, and historical inquiry linking require the [tracked Wallow release verification](https://github.com/bc-solutions-coder/bcordes/issues/31). Local tests cannot certify those external capabilities.
