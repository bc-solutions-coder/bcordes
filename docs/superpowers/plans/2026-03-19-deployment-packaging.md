# Deployment Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up stale Docker artifacts and create a self-contained prod compose that deploys the bcordes frontend alongside the Wallow backend, Postgres, and Valkey.

**Architecture:** Multi-stage Dockerfile builds a minimal Node.js runtime image. A production Docker Compose file pulls pre-built images for both frontend and backend, wiring them with shared infrastructure (Postgres, Valkey) on a single Docker network. Pangolin reverse proxy labels expose both services publicly.

**Tech Stack:** Docker, Docker Compose, Pangolin proxy, GitHub Actions, GHCR

**Spec:** `docs/superpowers/specs/2026-03-19-deployment-packaging-design.md`

---

### Task 1: Simplify Dockerfile and delete stale files

**Files:**

- Modify: `Dockerfile` (runtime stage — lines 48 onward)
- Delete: `docker-entrypoint.sh`
- Delete: `docker-compose.dev.yml`

The Dockerfile must be updated in the same commit as deleting `docker-entrypoint.sh`, otherwise an intermediate commit will have a broken build (Dockerfile references a deleted file).

- [ ] **Step 1: Remove stale COPY lines and entrypoint from Dockerfile runtime stage**

Replace everything after `COPY --from=builder /app/.output ./.output` (line 46) through the end of the file with:

```dockerfile
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

The full runtime stage should now be:

```dockerfile
# ---------- Runtime stage: minimal image to actually run the server ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Copy the built output from the builder
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

- [ ] **Step 2: Delete docker-entrypoint.sh**

```bash
git rm docker-entrypoint.sh
```

- [ ] **Step 3: Delete docker-compose.dev.yml**

```bash
git rm docker-compose.dev.yml
```

- [ ] **Step 4: Verify Dockerfile builds successfully**

```bash
docker build -t bcordes:test .
```

Expected: Build completes without errors.

- [ ] **Step 5: Verify the image starts**

```bash
docker run --rm -e SESSION_SECRET=test-secret-that-is-at-least-32-chars-long -e WALLOW_API_URL=http://localhost:5000 -p 3001:3000 bcordes:test &
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
docker stop $(docker ps -q --filter ancestor=bcordes:test)
```

Expected: HTTP 200 (or 302 redirect — either means the server started).

- [ ] **Step 6: Commit**

```bash
git add Dockerfile
git commit -m "$(cat <<'EOF'
chore: simplify Dockerfile and remove stale Docker artifacts

Remove Drizzle migration files, scripts, DB code, and entrypoint
script from the Dockerfile runtime stage. Delete docker-entrypoint.sh
and docker-compose.dev.yml — both leftovers from pre-Wallow architecture.
The runtime now just needs .output and node_modules.
EOF
)"
```

---

### Task 2: Rewrite docker-compose.yml for local dev

**Files:**

- Rewrite: `docker-compose.yml`

Replace the stale compose (hardcoded DATABASE_URL, seedbox-network, Pangolin SSO labels, old Postgres service) with a minimal local dev infrastructure compose providing Postgres and Valkey for running Wallow locally alongside `pnpm dev`.

- [ ] **Step 1: Overwrite docker-compose.yml**

```yaml
# Local dev infrastructure — run alongside `pnpm dev` and local Wallow
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
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
    restart: unless-stopped
    command: valkey-server --appendonly yes --requirepass ${VALKEY_PASSWORD:-devpassword}
    ports:
      - '127.0.0.1:6379:6379'
    volumes:
      - valkey_data:/data

volumes:
  postgres_data:
  valkey_data:
```

- [ ] **Step 2: Validate compose syntax**

```bash
docker compose config
```

Expected: Outputs the resolved compose config without errors.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "$(cat <<'EOF'
chore: rewrite docker-compose.yml for local dev

Replace stale Drizzle/Postgres compose with minimal infrastructure
for local Wallow development: Postgres 17 and Valkey (Redis-compatible
cache). No frontend container needed for dev — use pnpm dev directly.
EOF
)"
```

---

### Task 3: Write docker-compose.prod.yml

**Files:**

- Rewrite: `docker-compose.prod.yml`

Self-contained production stack with all four services, Pangolin labels, healthchecks, and env var references.

- [ ] **Step 1: Overwrite docker-compose.prod.yml**

```yaml
# Production stack — deploy via Portainer
# Requires .env file with secrets (see .env.example)
services:
  # ============================================
  # FRONTEND
  # ============================================
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

  # ============================================
  # BACKEND API
  # ============================================
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

  # ============================================
  # DATABASE
  # ============================================
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

  # ============================================
  # CACHE
  # ============================================
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

- [ ] **Step 2: Validate compose syntax**

```bash
docker compose -f docker-compose.prod.yml config
```

Expected: Outputs resolved config. Warnings about unset env vars are OK (they come from `.env` in prod).

- [ ] **Step 3: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "$(cat <<'EOF'
feat: add self-contained prod compose for Portainer deployment

Full stack: bcordes frontend, Wallow API, Postgres 17, and
Valkey cache. Pangolin proxy labels for site.bcordes.dev and
api.bcordes.dev. All secrets via .env file.
EOF
)"
```

---

### Task 4: Update .env.example

**Files:**

- Rewrite: `.env.example`

Replace stale Keycloak/Vite env vars with the new structure matching the prod compose.

- [ ] **Step 1: Overwrite .env.example**

```env
# ===========================================
# Production Environment Variables
# Copy to .env and fill in real values
# ===========================================

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

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "$(cat <<'EOF'
chore: update .env.example for Wallow stack

Remove stale Keycloak and VITE_* env vars. Add Postgres, Valkey,
Wallow connection string, and session secret variables matching
the new docker-compose.prod.yml.
EOF
)"
```

---

### Task 5: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

Update the environment variables section, deployment section, auth reference, and API conventions to reflect the current state.

- [ ] **Step 1: Update Auth line in Tech Stack**

Replace:

```
- **Auth:** Keycloak OIDC
```

With:

```
- **Auth:** OIDC (migrating from Keycloak to ASP.NET Identity + OpenIddict)
```

- [ ] **Step 2: Update Environment Variables section**

Replace the entire `## Environment Variables` section (heading through the code block) with:

    ## Environment Variables

    ```
    WALLOW_API_URL=https://...
    SESSION_SECRET=<at-least-32-chars>
    WALLOW_CLIENT_ID=sa-wallow-api
    WALLOW_CLIENT_SECRET=...
    WALLOW_TOKEN_URL=https://api.example.com/connect/token
    POSTGRES_USER=wallow
    POSTGRES_PASSWORD=...
    POSTGRES_DB=wallow
    VALKEY_PASSWORD=...
    WALLOW_CONNECTION_STRING=Host=postgres;Database=wallow;...
    WALLOW_VALKEY_URL=valkey:6379,password=...
    NODE_ENV=production
    PORT=3000
    ```

- [ ] **Step 3: Update Backend API section**

Remove the Key Docs list (those docs were deleted per git status). Remove Keycloak references from API Conventions. Replace:

```
### Key Docs
- `docs/api/API_DEVELOPMENT_GUIDE.md` — endpoint conventions, error formats (RFC 7807)
- `docs/api/AUTHORIZATION.md` — Keycloak OIDC, RBAC, permission expansion, multi-tenancy
- `docs/api/SIGNALR_GUIDE.md` — real-time hub at `/hubs/realtime`, presence tracking
- `docs/api/FILE_STORAGE_GUIDE.md` — S3/local file storage, presigned uploads
- `docs/api/service-accounts.md` — OAuth2 client credentials for M2M auth
- `docs/api/CONFIGURATION_GUIDE.md` — backend configuration reference

### API Conventions
- REST endpoints: `/api/{module}/{resource}` (e.g., `/api/billing/invoices`)
- Auth: Keycloak JWT via `Authorization: Bearer <token>`
- Errors: RFC 7807 Problem Details JSON
- CORS: Configured to allow frontend origins
```

With:

```
### API Conventions
- REST endpoints: `/api/{module}/{resource}` (e.g., `/api/billing/invoices`)
- Auth: JWT via `Authorization: Bearer <token>` (migrating to OpenIddict)
- Errors: RFC 7807 Problem Details JSON
- CORS: Configured to allow frontend origins
```

- [ ] **Step 4: Update Deployment section**

Replace:

```
## Deployment

Push to `main` or create a version tag triggers GitHub Actions, which builds a multi-platform Docker image (amd64/arm64) and pushes to GHCR. Portainer auto-deploys from the registry.
```

With:

```
## Deployment

Push to `main` triggers GitHub Actions, which builds the Docker image and pushes to GHCR.

Production runs as a Docker Compose stack via Portainer:
- `docker-compose.prod.yml` — full stack (frontend, Wallow API, Postgres, Valkey)
- `docker-compose.yml` — local dev infrastructure only (Postgres, Valkey)

See `.env.example` for required environment variables.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: update CLAUDE.md for Wallow deployment stack

Remove stale Keycloak env vars and deleted doc references. Update
auth description to reflect migration in progress. Document new
compose file structure and environment variables.
EOF
)"
```

---

### Task 6: Verify full build pipeline

Final validation that all changes work together.

- [ ] **Step 1: Verify Docker build still works**

```bash
docker build -t bcordes:verify .
```

Expected: Clean build, no errors.

- [ ] **Step 2: Validate both compose files**

```bash
docker compose config && docker compose -f docker-compose.prod.yml config
```

Expected: Both output resolved configs without errors.

- [ ] **Step 3: Verify no stale references remain**

```bash
grep -r "drizzle\|DATABASE_URL\|seedbox-network\|docker-entrypoint\|VITE_KEYCLOAK\|VITE_WALLOW" --include="*.yml" --include="*.yaml" --include="Dockerfile" --include=".env.example" --include="CLAUDE.md" .
```

Expected: No matches (or only in docs/specs which are fine).

- [ ] **Step 4: Review git status**

```bash
git status
git log --oneline -6
```

Expected: Clean working tree, 5 commits from tasks 1–5.
