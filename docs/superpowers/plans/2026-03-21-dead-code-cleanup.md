# Implementation Plan: Dead Code Cleanup & Repo Hygiene

**Design Doc:** `docs/superpowers/specs/2026-03-21-dead-code-cleanup-design.md`
**Date:** 2026-03-21

---

## Phase 1 — Parallel Deletions & Cleanups

All items in this phase are independent and can be executed in parallel by separate agents.

### Step 1.1: Remove npm Lockfile + Verify pnpm

**Design doc item:** 2
**Files:** `package-lock.json`

1. Delete `package-lock.json`
2. Run `pnpm install` to ensure `pnpm-lock.yaml` is current
3. Run `pnpm build` to verify nothing breaks

### Step 1.2: Remove Stale Drizzle Scripts

**Design doc item:** 3
**Files:** `package.json`

1. Remove these scripts from `package.json`:
   - `db:generate`, `db:migrate`, `db:push`, `db:pull`, `db:studio` (reference nonexistent `drizzle-kit`)
   - `db:start`, `db:stop`, `db:restart`, `db:logs`, `db:reset` (reference nonexistent `docker-compose.dev.yml`)
   - `db:seed`, `db:seed:local` (reference nonexistent `scripts/seed-admin.ts`)
2. Check if `drizzle-kit` or `drizzle-orm` are in `dependencies`/`devDependencies` — remove if present
3. Check for any `dotenv` CLI dependency used only by `db:seed:local` — remove if unused elsewhere

### Step 1.3: Delete Unused Files

**Design doc item:** 5
**Files to delete:**

- `src/lib/animations.ts` — unused Framer Motion variants
- `src/lib/blog.types.ts` — exact duplicate of `blog.ts`, never imported
- `src/polyfill.ts` — oRPC polyfill, oRPC not used
- `src/components/storybook/` — entire directory (11 files: 5 components + 5 stories + barrel)
- `src/components/contact/index.ts` — unused barrel export

### Step 1.4: Remove Dead Blog Functions

**Design doc item:** 6
**Files:** `src/lib/blog.server.ts`

1. Remove `getBlogPostsByTag(tag)` function
2. Remove `getAllTags()` function
3. Keep `getBlogPosts()` and `getBlogPostBySlug()` — these are used

### Step 1.5: Delete Scaffold Artifacts

**Design doc item:** 7, 8
**Files to delete:**

- `.cta.json` — CTA scaffold config, no runtime use
- `.cursorrules` — single shadcn install instruction, no value

### Step 1.6: Delete Homepage Variations

**Design doc item:** 9
**Files:** `docs/homepage-variations/` (31 HTML files)

1. Delete the entire `docs/homepage-variations/` directory
2. Git history preserves them if needed

### Step 1.7: Update Blog Post

**Design doc item:** 10
**Files:** `src/content/blog/first-post.mdx`

1. Replace "Drizzle ORM with SQLite (for future features)" with "Wallow API with PostgreSQL"
2. Update "What's Next" section — remove items that are now implemented (contact form, resume page)
3. Keep items that are still future work

### Step 1.8: Remove Unused UI Components

**Design doc item:** 11
**Files:** `src/components/ui/` (29 files to delete)

**Keep (likely near-term use):** `dialog`, `tabs`, `tooltip`, `skeleton`, `popover`, `progress`, `spinner`

**Delete these 29 components:**

- `accordion.tsx`
- `alert-dialog.tsx`
- `alert.tsx`
- `aspect-ratio.tsx`
- `breadcrumb.tsx`
- `button-group.tsx`
- `calendar.tsx`
- `carousel.tsx`
- `chart.tsx`
- `collapsible.tsx`
- `command.tsx`
- `context-menu.tsx`
- `drawer.tsx`
- `empty.tsx`
- `field.tsx`
- `hover-card.tsx`
- `input-group.tsx`
- `input-otp.tsx`
- `item.tsx`
- `kbd.tsx`
- `menubar.tsx`
- `pagination.tsx`
- `radio-group.tsx`
- `resizable.tsx`
- `scroll-area.tsx`
- `sidebar.tsx`
- `slider.tsx`
- `switch.tsx`
- `toggle-group.tsx`
- `toggle.tsx`

**After deletion:** Verify no remaining imports reference deleted components. Run `pnpm build` to catch any missed references.

---

## Phase 2 — Route Consolidation & Doc Updates

### Step 2.1: Consolidate Admin Routes

**Design doc item:** 4
**Files modified:** `src/routes/dashboard/inquiries/inquiries.index.tsx`
**Files deleted:** `src/routes/admin/messages.tsx`, `src/routes/admin/` (if empty)
**Files updated:** Navigation components referencing `/admin/messages`

1. **Read both route files** to understand current implementations
2. **Restyle `inquiries.index.tsx`** to use the admin/messages table layout:
   - Replace card-based list with a `<Table>` layout
   - Add columns: Name, Email, Company, Project Type, Budget, Date, Status
   - Add header bar: Mail icon + "Messages" title + count Badge + Refresh button
   - Row click navigates to `/dashboard/inquiries/$id` (keep the detail page)
   - Keep SignalR real-time subscription
3. **Data source:** Keep `fetchMyInquiries` — it already handles role-based filtering (admins see all, non-admins see their own)
4. **Role-aware UI:** Admin users see inline status `<Select>` controls on each row. Non-admin users see a read-only status Badge without the select. Check `isAdmin` from user roles (same pattern as `inquiries.$id.tsx`).
5. **Status values:** Use the dashboard's status set (`new`, `open`, `in_progress`, `resolved`, `closed`) — these match the Wallow API. Drop the admin/messages simplified statuses (`new`, `read`, `responded`).
6. **Update navigation links:**
   - Find `UserMenu.tsx` and `MobileNav.tsx` (or equivalent nav components)
   - Change `/admin/messages` links to `/dashboard/inquiries`
7. **Delete** `src/routes/admin/messages.tsx`
8. **Delete** `src/routes/admin/` directory if empty
9. **Note:** Keep `src/routes/dashboard/inquiries.tsx` (the layout route with `<Outlet />`) — it is needed for nested routing
10. **Note:** After deleting admin route, TanStack Router will regenerate `src/routeTree.gen.ts` on next build/dev — this is expected
11. **Verify:** Run `pnpm build` to regenerate route tree, then confirm `/dashboard/inquiries` renders correctly

### Step 2.2: Update CLAUDE.md

**Design doc item:** 1
**Files:** `CLAUDE.md`

Update the following sections:

1. **Routes table:**
   - Change `/work` to `/projects`
   - Change `/work/:slug` to `/projects/$slug`
   - Remove `/admin/messages`
   - Add `/dashboard/inquiries` and `/dashboard/inquiries/:id`
2. **Server Functions:**
   - Replace `submitContact`, `getContacts`, `updateContactStatus`, `trackPageView`
   - With: `submitInquiry`, `fetchInquiry`, `fetchInquiries`, `fetchMyInquiries`, `updateInquiryStatus`, `fetchInquiryComments`, `submitInquiryComment`, `fetchNotifications`, `serverRequireAuth`
3. **Key Features:**
   - Remove "Dark Mode" line
   - Remove "Analytics" line
   - Add "Real-time Updates: SignalR integration for live inquiry updates"
4. **Component directories:**
   - Change `work/` to `projects/`
   - Remove `storybook/` (deleted in Phase 1)

---

## Phase 3 — Verification

### Step 3.1: Full Build Check

1. Run `pnpm install` (in case lockfile changed)
2. Run `pnpm build` — must succeed with zero errors
3. Run `pnpm test` — all tests must pass
4. Run `pnpm lint` — check for import errors referencing deleted files

### Step 3.2: Manual Smoke Test (optional)

1. Start dev server: `pnpm dev`
2. Visit `/`, `/projects`, `/contact`, `/blog`
3. Log in and visit `/dashboard/inquiries`
4. Verify table layout renders correctly
5. Verify detail page still works at `/dashboard/inquiries/:id`
