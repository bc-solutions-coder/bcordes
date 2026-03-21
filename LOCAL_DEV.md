# Local Development Guide

Quick reference for setting up and running your personal site locally with a Dockerized PostgreSQL database.

## Setup

### 1. Start the PostgreSQL Database

```bash
# Start the database container
pnpm db:start

# Check if it's running
pnpm db:logs
```

This will:
- Create a PostgreSQL 16 container
- Expose it on `localhost:5432`
- Create a database named `personalsite`
- Store data in a Docker volume `postgres-dev-data`

### 2. Configure Environment Variables

Your `.env.local` should already be configured with:
```env
DATABASE_URL="postgresql://personalsite:2397778800@localhost:5432/personalsite"
```

### 3. Run Database Migrations

```bash
# Generate migration files (if schema changed)
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Or push schema directly (for development)
pnpm db:push
```

### 4. Start the Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## Database Management Commands

| Command | Description |
|---------|-------------|
| `pnpm db:start` | Start PostgreSQL container |
| `pnpm db:stop` | Stop PostgreSQL container |
| `pnpm db:restart` | Restart PostgreSQL container |
| `pnpm db:logs` | View PostgreSQL logs (Ctrl+C to exit) |
| `pnpm db:reset` | Stop, delete all data, and start fresh |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:generate` | Generate migration files |
| `pnpm db:migrate` | Run migrations |

## Daily Workflow

```bash
# Morning: Start your day
pnpm db:start
pnpm dev

# During development
# Make schema changes in src/db/schema.ts
pnpm db:push  # Push changes to database

# View/edit data
pnpm db:studio

# Evening: Stop database (or leave it running)
pnpm db:stop
```

## Connecting to PostgreSQL Directly

You can connect to the database using any PostgreSQL client:

```bash
# Using psql
psql postgresql://personalsite:2397778800@localhost:5432/personalsite

# Using TablePlus, DBeaver, pgAdmin, etc.
Host: localhost
Port: 5432
Database: personalsite
Username: personalsite
Password: 2397778800
```

## Troubleshooting

### Port 5432 already in use

If you have PostgreSQL installed locally or another container using port 5432:

1. **Option A**: Stop your local PostgreSQL
   ```bash
   # macOS (if installed via Homebrew)
   brew services stop postgresql@16
   ```

2. **Option B**: Change the port in `docker-compose.dev.yml`
   ```yaml
   ports:
     - "5433:5432"  # Use 5433 on host
   ```
   Then update `.env.local`:
   ```env
   DATABASE_URL="postgresql://personalsite:2397778800@localhost:5433/personalsite"
   ```

### Database container won't start

```bash
# Check what's wrong
pnpm db:logs

# Force recreate
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### Reset everything

```bash
# Nuclear option: delete all data and start fresh
pnpm db:reset

# Then rerun migrations
pnpm db:push
```

### Connection refused errors

Make sure the database container is running:
```bash
docker ps | grep bcordes-dev-db
```

If not running:
```bash
pnpm db:start
```

## Development vs Production

| Environment | Database Host | Configuration File |
|------------|---------------|-------------------|
| **Local Dev** | `localhost:5432` | `.env.local` |
| **Production** | `db:5432` (Docker network) | `docker-compose.prod.yml` |

When you push to production, the `DATABASE_URL` environment variable is set in Portainer with hostname `db` which resolves within the Docker network.

## Data Persistence

Your database data is stored in a Docker volume called `postgres-dev-data`. This means:
- ✅ Data persists between `pnpm db:stop` and `pnpm db:start`
- ✅ Data survives system restarts
- ❌ Data is deleted with `pnpm db:reset` or `docker compose down -v`

To backup your data:
```bash
docker exec bcordes-dev-db pg_dump -U personalsite personalsite > backup.sql
```

To restore:
```bash
cat backup.sql | docker exec -i bcordes-dev-db psql -U personalsite personalsite
```
