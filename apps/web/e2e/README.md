# Browser verification

Build the production artifact, install Chromium, then run the browser suite:

```sh
pnpm build
pnpm --filter bcordes exec playwright install chromium
E2E_PORT=4517 pnpm --filter bcordes exec playwright test
```

The suite starts `.output/server/index.mjs` with production settings and never
reuses an existing server. It supplies its own session secret and backend URL;
the production server does not load the local `.env` file.

By default, global setup starts an ephemeral `valkey/valkey:8-alpine` Docker
container. CI can instead provide a dedicated Valkey service through
`E2E_VALKEY_URL=redis://127.0.0.1:6379`. Use an empty test instance: setup seeds
and later deletes the application's service-token cache key.

`E2E_PORT` defaults to 3000. The controlled backend defaults to the next port
(`E2E_BACKEND_PORT` overrides it), and local Valkey defaults to the port after
that (`E2E_VALKEY_PORT` overrides it).

Authenticated tests create separate Valkey sessions and seal real session
cookies. Server functions forward requests to the controlled HTTP backend.
Contact submissions use a cached service token through the real server function.
Notification state is isolated by session access token. Login access checks stop
at the redirect to the identity provider; they do not authenticate against OIDC.

On Linux CI, install Chromium system dependencies with
`pnpm --filter bcordes exec playwright install --with-deps chromium`.
