# Local setup

Use Node.js 24 and pnpm 10.28.2, matching the [Dockerfile](../Dockerfile) and [workspace manifest](../package.json). Docker is needed for local Valkey and the default browser test setup. Application data lives in Wallow; this repository has no local PostgreSQL setup or database migration commands.

## Install dependencies

The SDK and API error packages come from GitHub Packages. Give your GitHub account read access to both packages and configure authentication in your user npm configuration:

```ini
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Export `NODE_AUTH_TOKEN` through your secret manager or shell environment, then run from the repository root:

```sh
pnpm install --frozen-lockfile
```

The checked-in [.npmrc](../.npmrc) selects the registry but contains no token. Installation does not load `.env` files. Linked worktrees do not inherit ignored environment files.

## Run public pages

Create an ignored `.env.local` in the repository root with these local-only values:

```dotenv
BFF_APP_ID=bcordes-local
BFF_API_BASE_URL=http://127.0.0.1:1
OIDC_ISSUER=http://127.0.0.1:1
OIDC_CLIENT_ID=local-preview
OIDC_CLIENT_SECRET=local-preview
OIDC_REDIRECT_URI=http://localhost:3000/bff/callback
OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/
COOKIE_PASSWORD=local-only-cookie-secret-at-least-32-characters
COOKIE_NAME=bcordes_local
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
REDIS_URL=redis://default:devpassword@127.0.0.1:6379
VALKEY_PASSWORD=devpassword
```

These placeholders allow public-page work without Wallow credentials. They do not enable login, contact submission, or account features. Use a browser session without existing site cookies.

```sh
docker compose --env-file .env.local up -d valkey
cd apps/web
node --env-file=../../.env.local node_modules/vite/bin/vite.js --port 3000
```

Open <http://localhost:3000>. The Node command explicitly loads the root environment file before starting Vite from the app directory. Auth and Valkey read `process.env`; do not rely on Vite loading that file into server code.

Check the local session store with `curl --fail http://localhost:3000/api/health`. A healthy response verifies Valkey, not Wallow connectivity. From the repository root, stop local infrastructure with `docker compose stop valkey`. The named volume preserves session data; removing the volume deletes it.

## Enable live features

Use an accessible Wallow deployment and a developer application registered for your local callback and logout URLs. Replace the preview API URL, issuer, and client credentials. Set the separately reachable discovery URL and approved scopes from [configuration](configuration.md). Register back-channel logout at `/bff/backchannel-logout` only on an address Wallow can reach.

Anonymous contact submission needs a separate inquiry service account. Signed-in features need user membership and API permissions; client scopes alone do not grant staff access. Follow [application registration](deployment.md#register-the-application) and [authentication](authentication.md) for those requirements.

Keep a distinct local app ID and cookie name. Use a generated private cookie password for real sessions. If the Valkey password changes, update its URL-encoded value in `REDIS_URL` too. Restart the dev server after changing configuration because the BFF and Valkey client are cached in the process.

## Build and check

Run from the repository root:

```sh
pnpm build
node scripts/verify-production.mjs
```

The smoke checker starts the built server with its own preview configuration and checks public HTML and assets. It does not exercise Wallow. See [testing](testing.md) for quality gates and browser checks, or [deployment](deployment.md) for container verification.
