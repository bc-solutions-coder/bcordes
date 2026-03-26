# Deployment Packaging Design

**Date:** 2026-03-19
**Scope:** Docker/deployment cleanup and production compose for bcordes + Wallow stack
**Follow-up:** Auth migration (Keycloak → Identity + OpenIddict) is a separate plan

## Context

The bcordes frontend needs to be deployed alongside the Wallow (.NET) backend as a self-contained Docker Compose stack. The current Docker setup has stale artifacts from a previous Drizzle/Postgres architecture that has been replaced by the Wallow backend. Keycloak is being removed in favor of ASP.NET Identity + OpenIddict (separate effort), so Keycloak is excluded from this deployment.

## Architecture

A single `docker-compose.prod.yml` in this repo brings up the entire stack:

| Service    | Image                                      | Purpose                 |
| ---------- | ------------------------------------------ | ----------------------- |
| `web`      | `ghcr.io/susp3nse/bcordes:latest`          | Frontend (SSR + static) |
| `wallow`   | `ghcr.io/bc-solutions-coder/wallow:latest` | Backend API             |
| `postgres` | `postgres:17-alpine`                       | Wallow's database       |
| `valkey`   | `valkey/valkey:8-alpine`                   | Wallow's cache          |

- All services share a `personal-network` Docker network
- `web` depends on `wallow`; `wallow` depends on `postgres` + `valkey`
- Both `web` and `wallow` get Pangolin proxy labels (public-facing domains)
- Wallow auto-migrates its database on startup — no init scripts needed

### Network & Proxy

- `web` is exposed via Pangolin at `site.bcordes.dev`
- `wallow` is exposed via Pangolin at `api.bcordes.dev` (browser makes direct API calls)
- Internal service communication uses Docker DNS (`wallow`, `postgres`, `valkey` hostnames)

## Changes

### 1. Dockerfile — Simplify

Remove stale copies from the runtime stage:

**Remove:**

- `COPY --from=builder /app/drizzle ./drizzle`
- `COPY --from=builder /app/scripts ./scripts`
- `COPY --from=builder /app/src/db ./src/db`
- `COPY --from=builder /app/src/lib/auth.ts ./src/lib/auth.ts`
- `COPY --from=builder /app/tsconfig.json ./tsconfig.json`
- `COPY docker-entrypoint.sh ./`
- `RUN chmod +x docker-entrypoint.sh`
- `ENTRYPOINT ["./docker-entrypoint.sh"]`

**Replace entrypoint with:**

```dockerfile
CMD ["node", ".output/server/index.mjs"]
```

### 2. Delete Stale Files

- `docker-entrypoint.sh` — Postgres wait + Drizzle migration logic
- `docker-compose.dev.yml` — standalone Postgres dev DB (replaced by new `docker-compose.yml`)

Note: The existing `docker-compose.yml` contains stale Drizzle/Postgres content (hardcoded `DATABASE_URL`, old `seedbox-network`, SSO labels). It is **replaced entirely** by the new local dev infrastructure compose in section 3.

### 3. docker-compose.yml — Local Dev Infrastructure

Provides just the infrastructure services needed to run `pnpm dev` locally against Wallow:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-wallow}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-wallow}
      POSTGRES_DB: ${POSTGRES_DB:-wallow}
    ports:
      - '127.0.0.1:5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-wallow}']
      interval: 10s
      timeout: 5s
      retries: 5

  valkey:
    image: valkey/valkey:8-alpine
    command: valkey-server --appendonly yes --requirepass ${VALKEY_PASSWORD:-devpassword}
    ports:
      - '127.0.0.1:6379:6379'
    volumes:
      - valkey_data:/data

volumes:
  postgres_data:
  valkey_data:
```

### 4. docker-compose.prod.yml — Production Stack

Full self-contained deployment for Portainer:

```yaml
services:
  web:
    image: ghcr.io/susp3nse/bcordes:latest
    container_name: bcordes
    restart: unless-stopped
    environment:
      - HOST=0.0.0.0
      - NODE_ENV=production
      - WALLOW_API_URL=https://api.bcordes.dev
      - WALLOW_CLIENT_ID=${WALLOW_CLIENT_ID}
      - WALLOW_CLIENT_SECRET=${WALLOW_CLIENT_SECRET}
      - WALLOW_TOKEN_URL=${WALLOW_TOKEN_URL}
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      wallow:
        condition: service_started
    labels:
      - pangolin.proxy-resources.personal.name=personal
      - pangolin.proxy-resources.personal.full-domain=site.bcordes.dev
      - pangolin.proxy-resources.personal.protocol=http
      - pangolin.proxy-resources.personal.targets[0].method=http
      - pangolin.proxy-resources.personal.targets[0].port=3000

  wallow:
    image: ghcr.io/bc-solutions-coder/wallow:latest
    container_name: wallow-api
    restart: unless-stopped
    environment:
      - ConnectionStrings__Default=${WALLOW_CONNECTION_STRING}
      - Valkey__ConnectionString=${WALLOW_VALKEY_URL}
    depends_on:
      postgres:
        condition: service_healthy
      valkey:
        condition: service_healthy
    labels:
      - pangolin.proxy-resources.wallow-api.name=wallow-api
      - pangolin.proxy-resources.wallow-api.full-domain=api.bcordes.dev
      - pangolin.proxy-resources.wallow-api.protocol=http
      - pangolin.proxy-resources.wallow-api.targets[0].method=http
      - pangolin.proxy-resources.wallow-api.targets[0].port=8080

  postgres:
    image: postgres:17-alpine
    container_name: wallow-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 10s
      timeout: 5s
      retries: 5

  valkey:
    image: valkey/valkey:8-alpine
    container_name: wallow-valkey
    restart: unless-stopped
    command: valkey-server --appendonly yes --requirepass ${VALKEY_PASSWORD}
    volumes:
      - valkey_data:/data
    environment:
      REDISCLI_AUTH: ${VALKEY_PASSWORD}
    healthcheck:
      test: ['CMD', 'valkey-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  default:
    name: personal-network

volumes:
  postgres_data:
  valkey_data:
```

Note: The old `VITE_WALLOW_API_URL` env var (Vite client-side prefix) is replaced by `WALLOW_API_URL` (server-side only, matching the existing code in `src/lib/wallow/client.ts`). Update any existing deployment configurations that reference the old name.

### 5. .env.example — Updated

```env
# Postgres (Wallow's database)
POSTGRES_USER=wallow
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=wallow

# Valkey (Wallow's cache)
VALKEY_PASSWORD=CHANGE_ME

# Wallow API
WALLOW_CONNECTION_STRING=Host=postgres;Database=wallow;Username=wallow;Password=CHANGE_ME
WALLOW_VALKEY_URL=valkey:6379,password=CHANGE_ME

# Frontend
WALLOW_API_URL=https://api.bcordes.dev
SESSION_SECRET=CHANGE_ME_AT_LEAST_32_CHARS

# Service Account (M2M auth for server functions)
WALLOW_CLIENT_ID=sa-wallow-api
WALLOW_CLIENT_SECRET=CHANGE_ME
WALLOW_TOKEN_URL=https://api.bcordes.dev/connect/token
```

### 6. CLAUDE.md — Update

- Remove Keycloak env vars from the environment variables section
- Update deployment section to reference the new compose structure
- Note that auth is in transition (Keycloak → Identity + OpenIddict, separate plan)

## What's Deliberately Excluded

- **Keycloak** — being replaced by Identity + OpenIddict (separate plan)
- **Observability stack** (Grafana, Alloy) — stays in Wallow repo for dev; prod observability is a separate concern
- **Mailpit** — dev-only email testing
- **ClamAV** — can be added to prod compose later if needed
- **Auth migration** — frontend OIDC flow changes are a follow-up plan

## Deployment Notes

**Secrets in Portainer:** Environment variables are configured via Portainer's stack environment editor when deploying the compose file. Create a `.env` file from `.env.example` with production values. Portainer supports uploading `.env` files or setting variables directly in the stack UI.

## Notes

- The Wallow image is published to GHCR via release-please tags (`ghcr.io/bc-solutions-coder/wallow:<version>`)
- The bcordes image is published on push to main (`ghcr.io/susp3nse/bcordes:latest`)
- Wallow env var names (e.g., `ConnectionStrings__Default`) need verification against the actual Wallow container — the names used here are conventional ASP.NET Core patterns but may differ
