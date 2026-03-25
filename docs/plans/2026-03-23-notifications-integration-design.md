# Notifications Integration Design

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Full-featured notifications integration for bcordes.dev, connecting the TanStack Start frontend to the Wallow backend's Notifications module. Covers: bug fix for current broken state, notifications center page, push notifications (WebPush), user preference management, smart routing, and real-time updates.

Reference: `docs/api/NOTIFICATIONS_GUIDE.md`

---

## 1. Bug Fix: Paginated Response Handling

The current `fetchNotifications` server function hits `/api/notifications` and casts the response as `Notification[]`, but the backend returns a paginated object. This causes `notifications.filter is not a function`.

**Fix:**

- Update endpoint to `/api/v1/notifications?pageNumber=1&pageSize=20`
- Extract `.items` from the paginated response wrapper
- Add a `PaginatedResponse<T>` type to `src/lib/wallow/types.ts`

This is the first thing implemented since it blocks current functionality.

---

## 2. Notifications Center (`/dashboard/notifications`)

A full inbox-style page:

- **Tabs/filter bar** -- All, Unread, plus filter chips by notification type (Task, Billing, System, etc.)
- **Notification list** -- Paginated, each item shows: icon by type, title, body preview (2-line clamp), timestamp, read/unread indicator
- **Detail view** -- Clicking a notification opens an inline detail panel (split view on desktop, full view on mobile) showing full message content, with a "Go to source" action button that smart-routes to the relevant page
- **Bulk actions** -- Toolbar with "Mark all read", "Mark selected read", select-all checkbox
- **Search + date filtering** -- Search input for text search, date range picker for filtering by time period
- **Infinite scroll or pagination controls** -- Load more as user scrolls, using the paginated API

The bell dropdown in the header stays as a quick-glance preview (latest 5 notifications) with a "View all" link to this page.

---

## 3. Push Notifications (WebPush)

- **Permission prompt** -- Non-intrusive banner/card in notification settings asking to enable push. User clicks "Enable" first, then browser prompt fires. No immediate browser prompt on page load.
- **Service worker** -- Registers for push event handling. Displays native OS notifications with title/body from backend payload. Clicking a push notification focuses the app tab and navigates via smart routing.
- **Device registration** -- On permission grant, register device token via `POST /api/v1/push/devices`. On logout or permission revoke, deregister via `DELETE /api/v1/push/devices/{id}`.
- **Settings toggle** -- In notification settings, a push on/off toggle. Off = deregisters device. On = triggers permission flow.
- **Test push** -- "Send test notification" button in settings that calls `POST /api/v1/push/send` targeting the current user.
- **VAPID public key** -- Fetched from backend (tenant push config) to pass to `pushManager.subscribe()`. Required by the Web Push API standard.

---

## 4. User Notification Settings

Lives under `/dashboard/settings` as a "Notifications" tab/section.

- **Channel toggles** -- Simple on/off switches for each channel: Email, SMS, Push, In-App. Uses `PUT /api/v1/notification-settings/channel`.
- **Push subsection** -- When Push is toggled on, shows permission flow (if not yet granted) and "Send test notification" button. When toggled off, deregisters device.
- **Layout** -- Card-based. Each channel gets a row with: channel icon, name, description, and toggle switch.
- **Optimistic updates** -- Toggle reflects immediately, reverts on API error with toast explaining failure.
- **Data fetching** -- `GET /api/v1/notification-settings` on page load, cached via TanStack Query with `['notification-settings']` key.

Per-type granularity (`PUT /api/v1/notification-settings/type`) is not in scope but the API layer will be structured for easy addition later.

---

## 5. Smart Routing & Bell Dropdown Enhancements

### Smart routing map

| NotificationType       | Route                                 |
| ---------------------- | ------------------------------------- |
| `TaskAssigned`         | `/dashboard/tasks/{entityId}`         |
| `TaskCompleted`        | `/dashboard/tasks/{entityId}`         |
| `TaskComment`          | `/dashboard/tasks/{entityId}`         |
| `BillingInvoice`       | `/dashboard/billing`                  |
| `InquirySubmitted`     | `/dashboard/inquiries/{entityId}`     |
| `InquiryStatusChanged` | `/dashboard/inquiries/{entityId}`     |
| `Mention`              | `/dashboard/notifications` (fallback) |
| `SystemAlert`          | `/dashboard/notifications`            |
| `Announcement`         | `/dashboard/notifications`            |
| Unknown/default        | `/dashboard/notifications`            |

Requires `Notification` type to include an optional `entityId` or `metadata` field. Falls back to notifications center if unavailable.

### Bell dropdown changes

- Show latest 5 notifications (not all)
- "Mark all as read" link in header
- "View all notifications" footer link to `/dashboard/notifications`
- Show on mobile too (remove `hidden md:inline-flex` restriction)

---

## 6. Data Layer & Real-Time Updates

### New server functions (`src/server-fns/notifications.ts`)

| Function                    | Method | Endpoint                                                    |
| --------------------------- | ------ | ----------------------------------------------------------- |
| `fetchNotifications`        | GET    | `/api/v1/notifications?pageNumber&pageSize&type&unreadOnly` |
| `markNotificationRead`      | POST   | `/api/v1/notifications/{id}/read`                           |
| `markAllNotificationsRead`  | POST   | `/api/v1/notifications/read-all`                            |
| `fetchUnreadCount`          | GET    | `/api/v1/notifications/unread-count`                        |
| `fetchNotificationSettings` | GET    | `/api/v1/notification-settings`                             |
| `updateChannelSetting`      | PUT    | `/api/v1/notification-settings/channel`                     |
| `registerPushDevice`        | POST   | `/api/v1/push/devices`                                      |
| `deregisterPushDevice`      | DELETE | `/api/v1/push/devices/{id}`                                 |
| `listPushDevices`           | GET    | `/api/v1/push/devices`                                      |
| `sendTestPush`              | POST   | `/api/v1/push/send`                                         |

### TanStack Query keys

- `['notifications', { page, type, unreadOnly }]` -- paginated list
- `['notifications', 'unread-count']` -- badge count
- `['notification-settings']` -- user preferences
- `['push-devices']` -- registered devices

### SignalR events

On `NotificationCreated`:

- Invalidate `['notifications']` queries
- Invalidate `['notifications', 'unread-count']`
- Show a toast with notification title (if tab is active)
