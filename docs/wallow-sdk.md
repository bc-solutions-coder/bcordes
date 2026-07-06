# `@bc-solutions-coder/sdk`

The Wallow SDK — a typed client for the Wallow backend plus the server-side BFF
(backend-for-frontend) OIDC tunnel. Published to **GitHub Packages** (not the
public npm registry) under the `@bc-solutions-coder` scope.

- **Version installed:** `0.1.0`
- **Format:** ESM only (`"type": "module"`), ships compiled `dist/` with `.d.ts`
  types and sourcemaps — no build step required.
- **Runtime deps:** `@hey-api/client-fetch`, `@tanstack/react-query`, `h3`,
  `iron-webcrypto`.

## Installation & Auth

Because it lives on GitHub Packages, resolving the package requires a token, and
the scope is mapped to GitHub's registry in `.npmrc` (committed, no secret):

```ini
# .npmrc
@bc-solutions-coder:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`NODE_AUTH_TOKEN` must hold a **classic** GitHub token with the **`read:packages`**
scope (add `repo` too if the package is private). Fine-grained PATs do **not**
work with the npm GitHub Packages registry.

The token is kept in `.env.local` (gitignored). Since pnpm does not auto-load
dotenv files, export it before installing:

```bash
set -a; . ./.env.local; set +a   # loads NODE_AUTH_TOKEN into the environment
pnpm add @bc-solutions-coder/sdk@0.1.0
```

In CI, expose a `read:packages` token as `NODE_AUTH_TOKEN` in the workflow env.

## Entrypoints

The package exposes two entrypoints with a strict client/server split.

### `@bc-solutions-coder/sdk` — browser client

Same-origin BFF client (sends the session cookie with every request) plus auth
helpers, alongside the generated typed API functions (`getV1…`, `postV1…`, etc.)
and their request/response types.

| Export                                        | Description                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `configureWallowClient(options?)`             | Point the shared client at the BFF path (defaults to `/api`) with credentials included.       |
| `client`                                      | The shared `@hey-api/client-fetch` client singleton used by the generated SDK functions.      |
| `login(returnTo?)`                            | Redirect the browser into the OIDC login flow.                                                |
| `logout()`                                    | Redirect the browser through logout.                                                          |
| `getUser()`                                   | Resolve the current identity from the BFF `/bff/user` endpoint; returns `WallowUser \| null`. |
| `WallowClientOptions`, `WallowUser`           | Supporting types.                                                                             |
| `getV1…` / `postV1…` / `putV1…` / `deleteV1…` | Generated typed API operations (announcements, changelog, identity, etc.).                    |

```ts
import { configureWallowClient, getUser, login } from '@bc-solutions-coder/sdk'

configureWallowClient() // defaults to same-origin /api
const user = await getUser()
if (!user) login(window.location.pathname)
```

### `@bc-solutions-coder/sdk/server` — BFF tunnel (server only)

h3-based server helpers for the OIDC tunnel. **Never import this in browser
code** — it deals with the client secret and cookie-sealing password.

| Export                                                                | Description                                                                                                                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `loadBffConfigFromEnv(env?)`                                          | Build a `BffConfig` from env vars (`OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `OIDC_POST_LOGOUT_REDIRECT_URI`, `BFF_API_BASE_URL`, `COOKIE_PASSWORD`; throws when required keys are missing). |
| `createBffHandlers(config)`                                           | Compose the four BFF h3 handlers: `{ login, callback, user, logout }`.                                                                                                                                                         |
| `createApiProxy(config)`                                              | The `/api` reverse proxy handler with silent token refresh.                                                                                                                                                                    |
| `ensureFreshSession(...)`                                             | Refresh the access token when within the expiry skew window.                                                                                                                                                                   |
| `readSession(event, config)` / `writeSession(event, config, session)` | Read/unseal and seal/write the sealed session cookie (handles multi-cookie chunking).                                                                                                                                          |
| `BffConfig`, `BffSession`                                             | Supporting types.                                                                                                                                                                                                              |

## Relationship to `src/lib/wallow` and `src/lib/auth`

This SDK packages functionality that currently also exists locally under
`src/lib/wallow/` (authenticated API client, errors, request handling) and
`src/lib/auth/` (OIDC, sealed sessions, middleware). Treat the two as
overlapping — before wiring the SDK into a route, decide whether it **replaces**
the local implementation or is used **alongside** it, to avoid two divergent
copies of the auth/session logic.

## Maintenance notes

- Bumping the version: `set -a; . ./.env.local; set +a; pnpm up @bc-solutions-coder/sdk@<version>`.
- If installs start failing with `permission_denied: token does not match
expected scopes`, the token has lost (or never had) the classic
  `read:packages` scope, or is a fine-grained PAT.
