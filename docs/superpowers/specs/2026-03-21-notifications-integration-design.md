# Notifications Integration Design

**Date:** 2026-03-21
**Status:** Deferred — reference doc for future implementation

---

## Context

A dead code audit found `src/server-fns/notifications.ts` exists but is never used. The Wallow backend has a notifications system ready to consume. This doc captures everything discovered so far to make pickup easy.

## What Already Exists

### Server Function
`src/server-fns/notifications.ts` — a working server function:

```ts
export const fetchNotifications = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get('/api/communications/notifications')
    return (await response.json()) as Notification[]
  },
)
```

### Type Definition
`src/lib/wallow/types.ts` defines the `Notification` interface:

```ts
export interface Notification {
  id: string
  type: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}
```

### OIDC Scopes Available
From the Wallow API (documented in CLAUDE.md and the frontend setup guide):

| Scope | Purpose |
|-------|---------|
| `notifications.read` | Read user notifications |
| `notifications.write` | Create/manage notifications |
| `messaging.access` | General messaging access |
| `announcements.read` | Read announcements |
| `announcements.manage` | Manage announcements |

The frontend currently does **not** request these scopes. They need to be added to the OIDC auth request in `src/lib/auth/oidc.ts`.

### SignalR Infrastructure
The project already has SignalR real-time infrastructure working for inquiries:
- `useSignalR()` hook exists and is used in `src/routes/dashboard/inquiries/`
- It subscribes to events like `InquirySubmitted`, `InquiryStatusUpdated`, `InquiryCommentAdded`
- The same pattern can likely be used for a `NotificationReceived` event if the Wallow API supports it

### Wallow Frontend Guide Reference
`docs/api/FRONTEND_SETUP_GUIDE.md` shows that Orval code generation produces a `notifications/notifications.ts` client. However, this project uses hand-written server functions (BFF pattern) rather than Orval-generated clients, so the existing `fetchNotifications` server function is the right approach.

## What Needs to Be Built

### 1. Verify Wallow API Endpoints
Check the OpenAPI spec at `http://localhost:5000/openapi/v1.json` for:
- `GET /api/communications/notifications` — list notifications (already assumed by the server function)
- `PUT/PATCH /api/communications/notifications/{id}/read` — mark as read (endpoint path TBD)
- `DELETE /api/communications/notifications/{id}` — dismiss notification (if supported)
- Any SignalR hub events for real-time notification push

### 2. Add OIDC Scope
Add `notifications.read` to the scopes requested during OIDC authorization in `src/lib/auth/oidc.ts`.

### 3. Create Server Functions
Beyond the existing `fetchNotifications`, likely need:
- `markNotificationRead(id)` — mark a single notification as read
- `markAllNotificationsRead()` — bulk mark-as-read
- `dismissNotification(id)` — if the API supports deletion

### 4. Build UI Components
**NotificationBell** — header component for authenticated users:
- Bell icon (Lucide `Bell`) in the main nav
- Unread count badge (red dot or number)
- Click opens a popover/dropdown with recent notifications
- Each notification shows title, body preview, timestamp, read/unread state
- "Mark all as read" action
- Clicking a notification marks it read and optionally navigates somewhere

**Placement:** Add to the authenticated header nav, next to the user menu.

### 5. Real-Time (Optional)
If Wallow sends `NotificationReceived` via SignalR:
- Subscribe in the NotificationBell component
- Invalidate the notifications query on new events
- Optionally show a toast via Sonner for high-priority notifications

## Architecture Pattern to Follow

Follow the same pattern used by inquiries:
1. Server function in `src/server-fns/notifications.ts` (already exists)
2. TanStack Query for data fetching and caching
3. SignalR hook for real-time updates
4. Sonner for toast notifications

## Open Questions

- What are the exact CRUD endpoints for notifications in the Wallow API?
- Does Wallow push notifications via SignalR, or is it poll-only?
- Should notifications link to specific resources (e.g., clicking a "new inquiry" notification navigates to that inquiry)?
- Should notifications appear on all authenticated pages or only in the dashboard?
- Is there a notification preferences/settings API?
