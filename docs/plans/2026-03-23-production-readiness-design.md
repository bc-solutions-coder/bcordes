# Production Readiness: Cleanup, Notifications, and URL Configuration

**Date:** 2026-03-23

## Goal

Prepare bcordes.dev for production deployment at `bcordes.dev` (not `site.bcordes.dev`). Clean up dead code, add in-app notification system, and ensure all auth/API URLs are correctly configured.

## Sections

### 1. Dead Code & Cleanup

- **Delete `src/routes/login.tsx`** — separate login page is unnecessary; sign-in goes directly to `/auth/login` (OIDC redirect to Wallow)
- **Update `src/components/layout/UserMenu.tsx`** — change Sign In link from `/login` to `/auth/login`; remove unused `UserIcon` import
- **Update `src/components/layout/MobileNav.tsx`** — same Sign In link fix if it references `/login`
- **Update `src/server-fns/notifications.ts`** — fix endpoint from `/api/communications/notifications` to `/api/notifications`; add `markNotificationRead` function

### 2. Notification System (Bell Icon)

**Server functions** (`src/server-fns/notifications.ts`):
- `fetchNotifications()` — `GET /api/notifications` (authenticated)
- `markNotificationRead({ id })` — `PATCH /api/notifications/{id}/read`

**Component** (`src/components/layout/NotificationBell.tsx`):
- Bell icon (lucide `Bell`) with unread count badge
- Only renders when user is logged in
- Dropdown panel (shadcn Popover or DropdownMenu) listing recent notifications
- Each notification shows title, body, time ago, read/unread styling
- Clicking a notification marks it as read and navigates to `/dashboard/inquiries/{inquiryId}`
- Initial data loaded via TanStack Query, refetched on SignalR events

**Real-time updates:**
- Subscribe to SignalR for `NotificationCreated` events
- On event: invalidate the notifications query so the bell updates automatically

**Placement:**
- In `Header.tsx`, between "Get in Touch" button and `UserMenu`, only shown when logged in

### 3. Production URL Configuration

**`docker-compose.prod.yml`:**
- Change Pangolin label from `site.bcordes.dev` to `bcordes.dev`

**`.env.example`:**
- Change `OIDC_REDIRECT_URI` from `https://site.bcordes.dev/auth/callback` to `https://bcordes.dev/auth/callback`

## Out of Scope

- Backend changes (Wallow API handles email-based inquiry linking, email notifications, and notification endpoints)
- New auth endpoints (OIDC flow is already correctly implemented and fully configurable via env vars)
