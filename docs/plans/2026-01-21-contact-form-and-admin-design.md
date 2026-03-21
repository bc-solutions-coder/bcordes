# Contact Form & Admin Panel Design

**Date:** 2026-01-21
**Status:** Approved

## Overview

Wire up the existing contact form to save messages to the database, add authentication using Better Auth, and create a protected admin page to view and manage contact submissions.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Contact Form   │─────▶│  oRPC endpoint  │─────▶│   PostgreSQL    │
│  (public)       │      │  submitContact  │      │   contacts      │
└─────────────────┘      └─────────────────┘      └─────────────────┘

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Login Page     │─────▶│  Better Auth    │─────▶│   PostgreSQL    │
│  /login         │      │  /api/auth/*    │      │   user, session │
└─────────────────┘      └─────────────────┘      └─────────────────┘

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Admin Messages │─────▶│  oRPC endpoint  │─────▶│   PostgreSQL    │
│  /admin/messages│      │  getContacts    │      │   contacts      │
│  (protected)    │      │  (protected)    │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## New Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Better Auth server configuration |
| `src/lib/auth-client.ts` | Better Auth React client |
| `src/routes/api.auth.$.ts` | Auth API catch-all route |
| `src/routes/login.tsx` | Login page |
| `src/routes/admin/messages.tsx` | Protected messages admin page |
| `scripts/seed-admin.ts` | One-time script to create admin user |

## Modified Files

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add user, session, account, verification tables |
| `src/orpc/router/contacts.ts` | Add `getContacts` endpoint |
| `src/orpc/router/index.ts` | Export new endpoint |
| `src/components/contact/ContactForm.tsx` | Wire to real oRPC API |
| `package.json` | Add better-auth dependency |

## Database Schema

### Better Auth Tables

```typescript
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  userId: text('user_id').notNull().references(() => user.id),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

## Auth Configuration

### Server (`src/lib/auth.ts`)

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '~/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
})
```

### Client (`src/lib/auth-client.ts`)

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
export const { signIn, signOut, useSession } = authClient
```

## Login Flow

1. User visits `/admin/messages`
2. Route checks for valid session
3. If no session → redirect to `/login`
4. User enters email/password
5. On success → redirect to `/admin/messages`
6. Session managed via cookies by Better Auth

## Admin Messages Page

### Features
- Table view of all contact submissions
- Columns: Name, Email, Company, Project Type, Budget, Date, Status
- Sorted by newest first
- Click row to expand full message
- Update status (new → read → responded)

### oRPC Endpoints

```typescript
// Get all contacts (admin only)
export const getContacts = os.handler(async () => {
  const results = await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.createdAt))
  return results
})

// Update contact status
export const updateContactStatus = os
  .input(z.object({
    id: z.number(),
    status: z.enum(['new', 'read', 'responded'])
  }))
  .handler(async ({ input }) => {
    await db
      .update(contacts)
      .set({ status: input.status })
      .where(eq(contacts.id, input.id))
    return { success: true }
  })
```

## Contact Form Wiring

Replace mock submission in `ContactForm.tsx`:

```typescript
import { client } from '~/orpc/client'

async function onSubmit(data: ContactFormValues) {
  setIsSubmitting(true)
  try {
    const result = await client.contacts.submitContact(data)
    toast.success(result.message)
    setIsSubmitted(true)
    form.reset()
  } catch (error) {
    toast.error('Failed to send message. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}
```

## Admin User Setup

Single admin user created via seed script:

```typescript
// scripts/seed-admin.ts
import { auth } from '~/lib/auth'

await auth.api.signUpEmail({
  body: {
    name: 'Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }
})
```

Run once after migration: `npx tsx scripts/seed-admin.ts`

## Environment Variables

```env
# Existing
DATABASE_URL=...

# New
BETTER_AUTH_SECRET=<generate-random-32-char-string>
ADMIN_EMAIL=<your-email>
ADMIN_PASSWORD=<your-password>
```

## Success Criteria

- [ ] Contact form submissions save to database
- [ ] Better Auth configured with email/password
- [ ] Login page functional
- [ ] Admin page shows all messages
- [ ] Admin page protected (redirects to login if unauthenticated)
- [ ] Can update message status from admin page
