# Dead Code Cleanup & Repo Hygiene

**Date:** 2026-03-21
**Status:** Draft

## Overview

Clean up dead code, stale scaffolding, outdated documentation, and consolidate duplicate admin routes discovered during a full repo audit.

---

## 1. Update CLAUDE.md to Match Current Codebase

**Problem:** CLAUDE.md has wrong route names, wrong server function names, references features that don't exist (dark mode, analytics), and lists incorrect component directories.

**Changes:**

| Section | Current (Wrong) | Correct |
|---------|-----------------|---------|
| Routes table | `/work`, `/work/:slug` | `/projects`, `/projects/$slug` |
| Routes table | Missing | Add `/dashboard/inquiries`, `/dashboard/inquiries/:id` |
| Routes table | `/admin/messages` | Remove (will be deleted in item 4) |
| Server Functions | `submitContact`, `getContacts`, `updateContactStatus`, `trackPageView` | `submitInquiry`, `fetchInquiry`, `fetchInquiries`, `fetchMyInquiries`, `updateInquiryStatus`, `fetchInquiryComments`, `submitInquiryComment`, `fetchNotifications`, `serverRequireAuth` |
| Features | "Dark Mode: Theme toggling via next-themes" | Remove — no dark mode exists |
| Features | "Analytics: Page view tracking" | Remove — no analytics exists |
| Features | Add "Real-time Updates" | SignalR integration for live inquiry updates |
| Features | Add "Notifications" | Wallow notification system integration |
| Component dirs | `work/` | `projects/` |
| Component dirs | Missing `storybook/` removal | Remove `storybook/` (deleted in item 5) |

---

## 2. Remove npm Lockfile, Ensure pnpm

**Problem:** Both `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm) exist. The project uses pnpm.

**Steps:**
1. Delete `package-lock.json`
2. Run `pnpm install` to ensure `pnpm-lock.yaml` is current
3. Verify build succeeds with `pnpm build`

---

## 3. Remove Stale Drizzle Scripts

**Problem:** `package.json` has 12 `db:*` scripts referencing `drizzle-kit`, `docker-compose.dev.yml`, and `scripts/seed-admin.ts` — none of which exist. The project uses Wallow (not Drizzle) for data.

**Scripts to remove:**
- `db:generate`, `db:migrate`, `db:push`, `db:pull`, `db:studio` — reference nonexistent `drizzle-kit`
- `db:start`, `db:stop`, `db:restart`, `db:logs`, `db:reset` — reference nonexistent `docker-compose.dev.yml`
- `db:seed`, `db:seed:local` — reference nonexistent `scripts/seed-admin.ts`

**Scripts to keep:** None of the `db:*` scripts. All database management happens through the Wallow backend.

---

## 4. Consolidate Admin Routes

**Problem:** Two routes serve the same purpose:
- `src/routes/admin/messages.tsx` — slim table-based UI, uses `fetchInquiries()` (all inquiries)
- `src/routes/dashboard/inquiries/` — card-based UI with detail page, comments, SignalR real-time updates

**Decision:** Remove `admin/messages.tsx` and restyle `dashboard/inquiries/` to use the slimmer table-based design from admin/messages while keeping dashboard/inquiries' superior features (comments, real-time, detail page).

**Design approach — merge the best of both:**

### List Page (`inquiries.index.tsx`)
Adopt the admin/messages table layout:
- Header: Mail icon + "Messages" title + count Badge + Refresh button
- Table with columns: Name, Email, Company, Project Type, Budget, Date, Status
- Inline status `<Select>` on each row — **admin only** (with `updateInquiryStatus`)
- Clicking a row navigates to the detail page (instead of a Sheet — keeps the dashboard's dedicated detail page)
- Keep SignalR real-time subscription from current dashboard version
- **Data source:** Use `fetchMyInquiries` — it already handles role-based filtering (admins see all inquiries, non-admins see only their own)
- **Role-aware UI:** Admin users see the full table with inline status `<Select>` controls. Non-admin users see a read-only table of their own inquiries without status controls.
- **Status values:** Use the dashboard's richer set (`new`, `open`, `in_progress`, `resolved`, `closed`) — these match the Wallow API's inquiry status model. The admin/messages statuses (`new`, `read`, `responded`) were a simplified frontend-only mapping and should be dropped.

### Detail Page (`inquiries.$id.tsx`)
Keep as-is from current dashboard implementation:
- Full inquiry details in a `<dl>` grid
- Comments section with internal notes (admin-only visibility)
- Comment form with "Internal note" checkbox
- SignalR real-time updates
- Back navigation to list

### Navigation Updates
- Remove `/admin/messages` from `UserMenu.tsx` and `MobileNav.tsx`
- Update links to point to `/dashboard/inquiries`

### Files to Delete
- `src/routes/admin/messages.tsx`
- `src/routes/admin/` directory if empty after deletion

---

## 5. Delete Unused Files

### `src/lib/animations.ts`
Framer Motion animation variants. Framer Motion is not installed. The project uses Tailwind CSS animations (`tw-animate-css`, `FadeInView`, `AnimatedText`). Delete entirely.

### `src/lib/blog.types.ts`
Exact duplicate of `src/lib/blog.ts`. Never imported anywhere — `blog.server.ts` imports from `./blog`. Delete entirely.

### `src/polyfill.ts`
oRPC Node.js 18 / Stackblitz polyfill. oRPC is not used, project targets Node.js 20+, not intended for Stackblitz. Delete entirely.

### `src/components/storybook/`
CTA scaffold demo components (button, dialog, input, radio-group, slider) with stories. These duplicate `src/components/ui/` and are not used in the app. Delete the entire directory:
- `button.tsx`, `button.stories.ts`
- `dialog.tsx`, `dialog.stories.tsx`
- `input.tsx`, `input.stories.ts`
- `radio-group.tsx`, `radio-group.stories.ts`
- `slider.tsx`, `slider.stories.ts`
- `index.ts`

### `src/components/contact/index.ts`
Unused barrel export — `ContactForm` is imported directly from `~/components/contact/ContactForm` everywhere. Delete the barrel file.

---

## 6. Remove Dead Functions in `blog.server.ts`

**Functions to remove:**
- `getBlogPostsByTag(tag)` — never called, no tag filtering UI exists
- `getAllTags()` — never called, no tag listing UI exists

**Keep:** `getBlogPosts()` and `getBlogPostBySlug()` — these are used by the blog routes.

---

## 7. Clean Up `.cta.json`

**Problem:** References scaffold add-ons that are no longer used (oRPC, drizzle, store).

**Options:**
- **Option A:** Update `chosenAddOns` to only list what's actually used: `eslint`, `start`, `form`, `table`, `shadcn`, `tanstack-query`, `storybook`. Remove the `addOnOptions.drizzle` block.
- **Option B:** Delete `.cta.json` entirely — it's a scaffold artifact with no runtime impact.

**Recommendation:** Option B — delete it. The scaffold has been fully customized and this file serves no purpose. No tooling reads it at runtime.

---

## 8. Remove `.cursorrules`

Contains only a single shadcn install command (`pnpx shadcn@latest add <component>`). This info is already common knowledge and adds no project-specific value. Delete the file.

---

## 9. Archive Homepage Variations

**Problem:** `docs/homepage-variations/` contains 30 HTML design mockups + an index page. Theme #22 (green-on-white) was chosen and implemented. These are design exploration artifacts.

**Recommendation:** Delete the entire `docs/homepage-variations/` directory. The chosen design is already implemented in the codebase. These files are 31 standalone HTML files with no value for ongoing development. Git history preserves them if ever needed.

---

## 10. Update Blog Post

**Problem:** `src/content/blog/first-post.mdx` references:
- "Drizzle ORM with SQLite" — project uses Wallow/PostgreSQL
- Planned features that are now implemented (contact form, resume page)

**Changes:**
- Replace "Drizzle ORM with SQLite (for future features)" with accurate backend description (Wallow API with PostgreSQL)
- Update "What's Next" section to remove implemented items and reflect actual current roadmap
- Consider whether this post should be updated or unpublished if it's too stale

---

## 11. Remove Unused UI Components

**Problem:** 36 of ~46 UI components in `src/components/ui/` are never imported. These came from the shadcn scaffold.

**Actually used (keep):** `avatar`, `badge`, `button`, `card`, `checkbox`, `dropdown-menu`, `form`, `input`, `label`, `navigation-menu`, `select`, `separator`, `sheet`, `sonner`, `table`, `textarea`

**Unused (candidates for deletion):** `accordion`, `alert-dialog`, `alert`, `aspect-ratio`, `breadcrumb`, `button-group`, `calendar`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `empty`, `field`, `hover-card`, `input-group`, `input-otp`, `item`, `kbd`, `menubar`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `sidebar`, `skeleton`, `slider`, `spinner`, `switch`, `tabs`, `toggle-group`, `toggle`, `tooltip`

**Consideration:** Some of these may be needed soon (e.g., `dialog` for confirmations, `tabs` for the dashboard, `tooltip` for UX, `popover` for notifications). Rather than deleting and re-adding via shadcn later, consider keeping components that are likely to be used soon:
- **Keep for likely near-term use:** `dialog`, `tabs`, `tooltip`, `skeleton`, `popover`, `progress`, `spinner`
- **Safe to delete (unlikely to need):** `accordion`, `alert-dialog`, `alert`, `aspect-ratio`, `breadcrumb`, `button-group`, `calendar`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `drawer`, `empty`, `field`, `hover-card`, `input-group`, `input-otp`, `item`, `kbd`, `menubar`, `pagination`, `radio-group`, `resizable`, `scroll-area`, `sidebar`, `slider`, `switch`, `toggle-group`, `toggle`

**Note:** shadcn components can be re-added in seconds with `pnpx shadcn@latest add <component>`, so aggressive deletion is low-risk.

---

## Execution Order

Dependencies between items:

1. **Phase 1 (no dependencies, can be parallel):**
   - Item 2: Remove `package-lock.json` + `pnpm install`
   - Item 3: Remove drizzle scripts
   - Item 5: Delete unused files (animations, blog.types, polyfill, storybook/, contact barrel)
   - Item 6: Remove dead blog.server.ts functions
   - Item 7: Delete `.cta.json`
   - Item 8: Delete `.cursorrules`
   - Item 9: Delete `docs/homepage-variations/`
   - Item 10: Update blog post
   - Item 11: Remove unused UI components

2. **Phase 2 (depends on Phase 1 completing):**
   - Item 4: Consolidate admin routes (restyle dashboard/inquiries with admin/messages UI, then delete admin/messages)
   - Item 1: Update CLAUDE.md (needs item 4 finalized)

3. **Final:** Run `pnpm build` to verify no breakage, then `pnpm test` if tests exist.
