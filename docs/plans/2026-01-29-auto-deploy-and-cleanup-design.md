# Auto-Deploy Database Setup & Project Cleanup

**Date:** 2026-01-29
**Status:** Draft

## Problem

The production deployment has two issues:

1. **Database tables don't exist.** The app container starts and immediately tries to query `page_views`, `contacts`, etc., but the fresh Postgres container has an empty database. Every DB-dependent request (contact form, page tracking) fails with a 500 error. There is no migration step in the deployment pipeline.

2. **Sample project content ships in production.** The `drop-enforcement-module.mdx` file is placeholder content that shouldn't appear on the live site.

## Goals

- Deploy the app and have it work immediately with zero manual steps
- Database tables are created automatically on first startup
- Admin user is seeded automatically if one doesn't exist
- Future deploys apply only new migrations (existing data is preserved)
- Remove sample project content while keeping the `/work` section functional

## Non-Goals

- Moving secrets out of docker-compose (separate concern)
- Optimizing the Docker image to exclude devDependencies (separate concern)
- Adding new features to the site

## Design

### Auto-Migration on Startup

The app container runs a shell entrypoint before starting the server:

```
Container starts
  1. Wait for Postgres to accept connections (retry loop)
  2. Run Drizzle migrations programmatically (drizzle-orm migrate API)
  3. Seed admin user if none exists (Better Auth signUpEmail API)
  4. Start the Node.js server
```

**Migration script** (`scripts/migrate.mjs`): A standalone ESM script that uses `drizzle-orm/node-postgres/migrator` to apply pending migrations. It reads `DATABASE_URL` from the environment, connects, runs migrations from the `drizzle/` folder, and exits. No TypeScript or drizzle-kit required at runtime.

**Seed integration**: The existing `scripts/seed-admin.ts` already handles the "already exists" case gracefully. The entrypoint runs it via `tsx` (available in node_modules) after migrations complete, only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars are set.

**Entrypoint script** (`docker-entrypoint.sh`): A shell script that orchestrates the three steps above, then execs into the Node server.

### Data Persistence

The Postgres data volume (`postgres-data`) persists across container restarts and redeploys. Drizzle tracks applied migrations in a `__drizzle_migrations` table. On redeploy:

- First deploy: all migrations run, all tables are created
- Subsequent deploys: only new migrations run, existing data is untouched
- Data is only lost if you explicitly run `docker compose down -v`

### Docker Changes

**Dockerfile** additions to the runtime stage:

- Copy `drizzle/` migration SQL files from the builder
- Copy `scripts/` directory (migrate.mjs, seed-admin.ts)
- Copy minimal source files needed by the seed script (`src/db/`, `src/lib/auth.ts`)
- Copy config files needed by tsx (`tsconfig.json`, `drizzle.config.ts`)
- Set `docker-entrypoint.sh` as the container entrypoint

**docker-compose.prod.yml** changes:

- Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars to the `web` service
- Add a healthcheck to the `db` service so `depends_on` can use `condition: service_healthy`
- Remove the separate `seed` service entirely

### Sample Content Removal

Delete `src/content/projects/drop-enforcement-module.mdx`. The `/work` routes and components remain — they render an empty state when no projects exist.

## Implementation Plan

### Step 1: Generate Drizzle Migration Files

Run `pnpm db:generate` locally to create the initial migration SQL files in `drizzle/`. These files represent the full schema (all tables). Commit them to the repo.

### Step 2: Create the Migration Script

Create `scripts/migrate.mjs`:

- Import `drizzle` from `drizzle-orm/node-postgres` and `migrate` from `drizzle-orm/node-postgres/migrator`
- Connect using `DATABASE_URL` env var
- Run `migrate(db, { migrationsFolder: './drizzle' })`
- Close the pool and exit

### Step 3: Create the Docker Entrypoint

Create `docker-entrypoint.sh`:

- Wait loop: attempt a `SELECT 1` query against Postgres, retry every 2 seconds up to 30 attempts
- Run `node scripts/migrate.mjs`
- If `ADMIN_EMAIL` is set, run `npx tsx scripts/seed-admin.ts`
- Exec `node .output/server/index.mjs`

### Step 4: Update the Dockerfile

Add to the runtime stage:

- `COPY --from=builder /app/drizzle ./drizzle`
- `COPY --from=builder /app/scripts ./scripts`
- `COPY --from=builder /app/src/db ./src/db`
- `COPY --from=builder /app/src/lib/auth.ts ./src/lib/auth.ts`
- `COPY --from=builder /app/tsconfig.json ./tsconfig.json`
- `COPY docker-entrypoint.sh ./`
- `RUN chmod +x docker-entrypoint.sh`
- `ENTRYPOINT ["./docker-entrypoint.sh"]`
- Remove the existing `CMD`

### Step 5: Update docker-compose.prod.yml

- Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` to the `web` service environment
- Add a healthcheck to the `db` service:
  ```yaml
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U personalsite']
    interval: 5s
    timeout: 5s
    retries: 5
  ```
- Update `web.depends_on` to use `condition: service_healthy`
- Remove the entire `seed` service block and the `profiles` config

### Step 6: Delete Sample Project Content

Delete `src/content/projects/drop-enforcement-module.mdx`.

### Step 7: Test Locally

1. Tear down any existing local containers: `docker compose -f docker-compose.prod.yml down -v`
2. Rebuild the image: `docker build -t bcordes:test .`
3. Start fresh: `docker compose -f docker-compose.prod.yml up`
4. Verify: tables exist, admin user is seeded, contact form works, `/work` shows empty state
5. Restart containers (without `-v`) to confirm migrations are idempotent

### Step 8: Deploy

Push the new image to GHCR. On the server, pull and restart. The entrypoint handles everything.
