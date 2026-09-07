# Deploying bcordes with Wallow

The migration is not production-ready until the [Wallow release gates](https://github.com/bc-solutions-coder/bcordes/issues/31) pass. Browser push remains blocked on its corrected delivery and authorization contract. Notification preferences, inquiry live updates and verified-email historical linking also require platform verification.

## Register the application

Use the existing Wallow deployment. Create one bcordes organization and a confidential developer application bound to it. Register these exact URLs for the default hostname:

- Callback: `https://bcordes.dev/bff/callback`
- Post-logout redirect: `https://bcordes.dev/`
- Back-channel logout: `https://bcordes.dev/bff/backchannel-logout`

Approve the application scopes for profile, inquiries and notifications. A requested scope is not itself staff authorization. Customers must have the ordinary customer membership; staff must have the platform permissions needed for organization inquiries. bcordes checks the API-expanded `InquiriesRead` capability for staff access. It never grants staff privileges from self-service signup.

Create a separate service account for anonymous contact submissions with only the available inquiry-submission grant. Signed-in submissions use the user's SDK session. Expired authenticated submissions must sign in again instead of falling back to service credentials.

Read the deployed discovery document to determine `OIDC_ISSUER`. The generic Wallow path configuration and its Pangolin subdomain configuration differ. Public discovery returned 403 from the research environment, so neither has been certified here. Verify that the discovery issuer matches the configured issuer and that the server can reach its advertised token, JWKS and userinfo endpoints.

## Load the stack in Dockhand

Import `docker-compose.prod.yml` and supply variables from `.env.example` through Dockhand's managed stack environment. The Compose file explicitly interpolates those values into the containers. Configure GHCR pull credentials in Dockhand if the image is private.

Set `BCORDES_IMAGE` to a tested image digest, preferably `ghcr.io/bc-solutions-coder/bcordes@sha256:...`, or its full `sha-<commit>` tag. Do not use mutable nightly tags for production rollback references.

Supply the developer client ID/secret, issuer, approved scopes, and separate inquiry service ID/secret. Keep the stable random `COOKIE_PASSWORD` at least 32 characters long. Set `VALKEY_PASSWORD` and a matching `REDIS_URL`, URL-encoding the password in the URL. Keep the named Valkey volume across updates. Set `SESSION_TTL_SECONDS` no longer than the Wallow refresh-token policy permits.

The web container joins external `wallow_wallow` under alias `bcordes-web`. Its default internal API and metadata addresses use `wallow-api:8080`; confirm that alias against the deployed stack. Valkey is reachable only on the app's private session network. Neither container publishes host ports.

Existing Newt discovers the `pangolin.public-resources.bcordes.*` labels and targets `bcordes-web:3000`. Confirm that Newt watches this stack and that the `bcordes.dev` resource/DNS entry is available. No extra tunnel, Docker socket, IP registration or second authentication gate is required. A staging deployment needs distinct Pangolin resource labels, network alias and BFF app ID.

`WALLOW_TRUSTED_PROXIES=private` matches the shared-network deployment but trusts private peer addresses on that network. Set a narrower peer/CIDR list when managed addresses are available. Only the original transport peer may establish forwarded-header trust.

## Migrate existing environment values

Use only one `OIDC_REDIRECT_URI`, ending in `/bff/callback`, and register the same URL in Wallow. Remove the old `/auth/callback` entry. Set `OIDC_POST_LOGOUT_REDIRECT_URI=https://bcordes.dev/`. Compose derives both URLs from `BCORDES_DOMAIN`.

| Old variable                  | SDK variable                 |
| ----------------------------- | ---------------------------- |
| `SESSION_SECRET`              | `COOKIE_PASSWORD`            |
| `VALKEY_URL`                  | `REDIS_URL`                  |
| `WALLOW_API_URL`              | `BFF_API_BASE_URL`           |
| `OIDC_SERVICE_ACCOUNT_ID`     | `OIDC_SERVICE_CLIENT_ID`     |
| `OIDC_SERVICE_ACCOUNT_SECRET` | `OIDC_SERVICE_CLIENT_SECRET` |

Keep `VALKEY_PASSWORD` for the Valkey container. `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` retain their names. The service client's ID and secret are the credentials issued for the separate Wallow service account.

`BFF_API_BASE_URL=https://api.wallow.dev` is also supported when reachable from the container. Set `OIDC_METADATA_URL` separately to the reachable discovery document; changing the API URL does not change Compose's internal discovery default. Set `OIDC_ISSUER=https://auth.wallow.dev` only when that exactly matches discovery's issuer.

Avoid copying platform-wide management scopes into either client. Start with the application scopes in `.env.example` and `OIDC_SERVICE_SCOPES=inquiries.write` for anonymous submissions, subject to Wallow's approved grants. Rotate credentials exposed outside the deployment secret store before deploying.

## Validate and update

A healthy `/api/health` response includes a successful Valkey ping. SDK configuration is checked when the application handles requests. A healthcheck is not proof of discovery, login or feature authorization.

Before production release, exercise customer enrollment, callback, current user, own-inquiry access and comments, denied cross-customer/internal/status operations, staff access, anonymous submission, preferences, actual browser push delivery, SSE recovery, refresh, logout and back-channel revocation. Verify organization-scoped historical linking with the corrected Wallow release.

Check Pangolin discovery, TLS, HTML/assets and server readiness. Test an app restart with a valid SDK session and persistent Valkey. Record the tested image digest, configuration names, SDK/platform versions and results. Keep a known-good image digest and compatible configuration for rollback.

This migration requires everyone to sign in again once. There is no legacy-session bridge. Ordinary subsequent updates preserve SDK sessions through stable cookie keys and persistent storage; rolling back across incompatible auth formats may require another sign-in.

## Build credentials

`NODE_AUTH_TOKEN` is used only for dependency installation and Docker builds. Do not supply it to the runtime container. Use a GitHub token with read access to both private packages. A trusted user npm configuration can reference `${NODE_AUTH_TOKEN}`; package installation does not load `.env` automatically, and worktrees do not inherit ignored environment files.

For Docker, export the token into the build environment and run:

```sh
docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN -t bcordes:verify .
bash scripts/verify-docker.sh
```

The token is mounted as a BuildKit secret. The runtime stage copies only Nitro's output. The verifier uses a disposable Valkey and tests the same image with two different runtime origins.
