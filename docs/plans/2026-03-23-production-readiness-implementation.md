# Production Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up dead code, add in-app notification bell, and fix production URLs so the site is ready to deploy at bcordes.dev.

**Architecture:** Three independent workstreams — (1) dead code removal and sign-in link fixes, (2) notification server functions + bell component wired into the header with SignalR real-time updates, (3) production URL config fixes. All frontend-only; backend (Wallow) is assumed ready.

**Tech Stack:** TanStack Start, TanStack Query, React, shadcn/ui (Popover, Badge, Button), lucide-react (Bell icon), SignalR via existing `useSignalR` hook.

---

### Task 1: Delete login page and fix sign-in links

**Files:**
- Delete: `src/routes/login.tsx`
- Modify: `src/components/layout/UserMenu.tsx:32-41`
- Modify: `src/components/layout/MobileNav.tsx:99-107`

**Step 1: Delete the login page route**

Delete the file `src/routes/login.tsx`. It's no longer needed — sign-in goes directly to `/auth/login` (OIDC redirect).

**Step 2: Fix UserMenu sign-in link and remove unused import**

In `src/components/layout/UserMenu.tsx`:

1. Remove the unused `User as UserIcon` from the lucide-react import on line 4 (keep `LayoutDashboard` and `LogOut`).
2. Change the Sign In link target from `/login` to `/auth/login` on line 39:

```tsx
// Before
<Link to="/login">Sign In</Link>

// After
<a href="/auth/login">Sign In</a>
```

Use an `<a>` tag (not `<Link>`) because `/auth/login` is a server route (API handler), not a client-side route.

**Step 3: Fix MobileNav sign-in link**

In `src/components/layout/MobileNav.tsx`, change the Sign In link on line 104:

```tsx
// Before
<Link to="/login" onClick={() => setOpen(false)}>
  Sign In
</Link>

// After
<a href="/auth/login" onClick={() => setOpen(false)}>
  Sign In
</a>
```

Same reasoning — `/auth/login` is a server route.

**Step 4: Verify the build compiles**

Run: `pnpm build`
Expected: Build succeeds. The route tree regenerates without `/login`.

**Step 5: Commit**

```bash
git add -u
git commit -m "chore: remove login page, fix sign-in links to use /auth/login directly"
```

---

### Task 2: Update notification server functions

**Files:**
- Modify: `src/server-fns/notifications.ts`

**Step 1: Rewrite notifications.ts with updated endpoint and mark-as-read**

Replace the contents of `src/server-fns/notifications.ts` with:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createWallowClient } from '~/lib/wallow/client'
import type { Notification } from '~/lib/wallow/types'

export const fetchNotifications = createServerFn({ method: 'GET' }).handler(
  async () => {
    const client = await createWallowClient()
    const response = await client.get('/api/notifications')
    return (await response.json()) as Notification[]
  },
)

export const markNotificationRead = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const client = await createWallowClient()
    await client.patch(`/api/notifications/${data.id}/read`)
  })
```

**Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/server-fns/notifications.ts
git commit -m "fix: update notification endpoints from /api/communications/notifications to /api/notifications"
```

---

### Task 3: Create NotificationBell component

**Files:**
- Create: `src/components/layout/NotificationBell.tsx`

**Step 1: Create the NotificationBell component**

Create `src/components/layout/NotificationBell.tsx`:

```tsx
'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUser } from '@/hooks/useUser'
import { useSignalR } from '@/hooks/useSignalR'
import {
  fetchNotifications,
  markNotificationRead,
} from '@/server-fns/notifications'
import type { Notification } from '@/lib/wallow/types'
import { useEffect } from 'react'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  )
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { subscribe } = useSignalR()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribe('NotificationCreated', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    return unsubscribe
  }, [user, subscribe, queryClient])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications],
  )

  const handleClick = useCallback(
    async (notification: Notification) => {
      if (!notification.readAt) {
        await markNotificationRead({ data: { id: notification.id } })
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      }
      // Navigate to the inquiry — notification type can guide routing
      // For now, all notifications link to the dashboard
      navigate({ to: '/dashboard/inquiries' })
    },
    [navigate, queryClient],
  )

  if (!user) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hidden md:inline-flex text-text-secondary hover:text-accent-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border-default px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Notifications
          </h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-secondary">
              No notifications
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-background-secondary ${
                  n.readAt ? 'opacity-60' : ''
                }`}
              >
                <p className="text-sm font-medium text-text-primary">
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
                  {n.body}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {timeAgo(n.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

**Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: Build succeeds (component not yet imported anywhere, tree-shaken out).

**Step 3: Commit**

```bash
git add src/components/layout/NotificationBell.tsx
git commit -m "feat: add NotificationBell component with real-time updates"
```

---

### Task 4: Wire NotificationBell into the Header

**Files:**
- Modify: `src/components/layout/Header.tsx:1-94`

**Step 1: Add NotificationBell import and render**

In `src/components/layout/Header.tsx`:

1. Add import at the top (after other layout imports):

```tsx
import { NotificationBell } from './NotificationBell'
```

2. Add `<NotificationBell />` in the button/menu area (line 81-89), between the "Get in Touch" button and `<UserMenu />`:

```tsx
{/* CTA Button, User Menu, and Mobile Nav */}
<div className="flex items-center gap-2">
  <Button
    asChild
    className="hidden md:inline-flex bg-accent-primary hover:bg-accent-tertiary text-white font-medium"
  >
    <Link to="/contact">Get in Touch</Link>
  </Button>
  <NotificationBell />
  <UserMenu />
  <MobileNav />
</div>
```

**Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: add notification bell to header"
```

---

### Task 5: Fix production URLs

**Files:**
- Modify: `docker-compose.prod.yml:27`
- Modify: `.env.example:26`

**Step 1: Update Pangolin label in docker-compose.prod.yml**

Change line 27:

```yaml
# Before
      - pangolin.proxy-resources.personal.full-domain=site.bcordes.dev

# After
      - pangolin.proxy-resources.personal.full-domain=bcordes.dev
```

**Step 2: Update .env.example redirect URI**

Change line 26:

```
# Before
OIDC_REDIRECT_URI=https://site.bcordes.dev/auth/callback

# After
OIDC_REDIRECT_URI=https://bcordes.dev/auth/callback
```

**Step 3: Verify no other references to site.bcordes.dev exist**

Run: `grep -r "site.bcordes.dev" --include="*.yml" --include="*.yaml" --include="*.env*" --include="*.md" .`
Expected: No matches (or only in the design doc which is fine).

**Step 4: Commit**

```bash
git add docker-compose.prod.yml .env.example
git commit -m "fix: update production domain from site.bcordes.dev to bcordes.dev"
```

---

### Task 6: Final verification

**Step 1: Full lint and build**

Run: `pnpm check && pnpm build`
Expected: No lint errors, build succeeds.

**Step 2: Dev server smoke test**

Run: `pnpm dev` and verify:
- Home page loads
- "Sign In" links point to `/auth/login` (not `/login`)
- No `/login` route exists (404 if navigated directly)
- Notification bell renders for logged-in users (if backend is running)

**Step 3: Commit any lint fixes if needed**

```bash
git add -u
git commit -m "chore: lint fixes"
```
