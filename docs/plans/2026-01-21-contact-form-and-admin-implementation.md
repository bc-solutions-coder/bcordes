# Implementation Plan: Contact Form & Admin Panel

**Design Doc:** [2026-01-21-contact-form-and-admin-design.md](./2026-01-21-contact-form-and-admin-design.md)

---

## Phase 1: Wire Contact Form

**Goal:** Make the contact form actually save submissions to the database.

**Tasks:**
1. **Wire contact form to oRPC endpoint**
   - Modify `src/components/contact/ContactForm.tsx`
   - Import oRPC client
   - Replace mock `onSubmit` with real API call
   - Handle errors appropriately

**Dependencies:** None (existing infrastructure ready)

---

## Phase 2: Better Auth Setup

**Goal:** Install and configure Better Auth with Drizzle adapter.

**Tasks:**
1. **Install better-auth package**
   - `npm install better-auth`

2. **Add auth tables to database schema**
   - Modify `src/db/schema.ts`
   - Add user, session, account, verification tables

3. **Run database migration**
   - `npm run db:push` or generate migration

4. **Create auth server configuration**
   - Create `src/lib/auth.ts`
   - Configure Drizzle adapter with PostgreSQL

5. **Create auth client**
   - Create `src/lib/auth-client.ts`
   - Export signIn, signOut, useSession

6. **Create auth API route**
   - Create `src/routes/api.auth.$.ts`
   - Handle all Better Auth endpoints

**Dependencies:** None

---

## Phase 3: Login Page

**Goal:** Create a functional login page.

**Tasks:**
1. **Create login page route**
   - Create `src/routes/login.tsx`
   - Build login form (email + password)
   - Handle submission with Better Auth
   - Redirect to admin on success
   - Show error messages on failure

**Dependencies:** Phase 2 (Better Auth setup)

---

## Phase 4: Admin Messages Page

**Goal:** Create protected admin page to view and manage contact submissions.

**Tasks:**
1. **Add getContacts oRPC endpoint**
   - Modify `src/orpc/router/contacts.ts`
   - Add query to fetch all contacts ordered by date
   - Export from router index

2. **Add updateContactStatus oRPC endpoint**
   - Modify `src/orpc/router/contacts.ts`
   - Add mutation to update contact status
   - Export from router index

3. **Create admin messages page**
   - Create `src/routes/admin/messages.tsx`
   - Check auth, redirect to login if unauthenticated
   - Fetch and display contacts in table
   - Expandable rows for full message
   - Status update functionality
   - Logout button

**Dependencies:** Phase 2 (auth), Phase 3 (login page)

---

## Phase 5: Admin User Setup

**Goal:** Create admin account and document setup.

**Tasks:**
1. **Create admin seed script**
   - Create `scripts/seed-admin.ts`
   - Use Better Auth API to create user
   - Read credentials from env vars

2. **Update environment documentation**
   - Document BETTER_AUTH_SECRET
   - Document ADMIN_EMAIL, ADMIN_PASSWORD
   - Add to .env.example if exists

**Dependencies:** Phase 2 (Better Auth setup)

---

## Execution Order

```
Phase 1 ─────────────────────────────────────────▶ (can start immediately)

Phase 2 ─────────────────────────────────────────▶ (can start immediately)
            │
            ▼
Phase 3 ─────────────────────────────────────────▶ (needs Phase 2)
            │
            ▼
Phase 4 ─────────────────────────────────────────▶ (needs Phase 2, 3)

Phase 5 ─────────────────────────────────────────▶ (needs Phase 2)
```

**Phase 1 and Phase 2 can run in parallel.**
