# Configuration

The [BFF](../packages/auth/src/bff.ts) loads SDK configuration from `process.env` on first use. The [Valkey client](../packages/valkey/src/client.ts) separately requires `REDIS_URL`. Both instances are cached, so restart the process after changes.

For local development, use the explicit environment-file command in [local setup](setup.md#run-public-pages). For a built server, supply environment variables to `node apps/web/.output/server/index.mjs`. Keep secrets server-side; never rename them with a `VITE_` prefix.

[.env.example](../.env.example) lists deployment inputs. It is not a ready-to-run local environment. [Local setup](setup.md) supplies preview values.

## Application variables

| Variable                                               | Purpose                                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BFF_APP_ID`                                           | Separates SDK storage keys between applications. Use a distinct value for local development or staging.                                                                                 |
| `BFF_API_BASE_URL`                                     | Wallow API origin reachable from the app server.                                                                                                                                        |
| `OIDC_ISSUER`                                          | Exact issuer returned by the deployed discovery document. Do not infer it from the API hostname.                                                                                        |
| `OIDC_METADATA_URL`                                    | Reachable discovery document URL. Configure it separately from the API URL.                                                                                                             |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`                 | Confidential developer application credentials for user login.                                                                                                                          |
| `OIDC_SCOPES`                                          | Space-separated scopes approved for that application. The example requests `openid profile email offline_access inquiries.read inquiries.write notifications.read notifications.write`. |
| `OIDC_REDIRECT_URI`                                    | Registered callback URL, ending in `/bff/callback`.                                                                                                                                     |
| `OIDC_POST_LOGOUT_REDIRECT_URI`                        | Registered destination after logout. The normal destination is the site's root URL.                                                                                                     |
| `OIDC_SERVICE_CLIENT_ID`, `OIDC_SERVICE_CLIENT_SECRET` | Separate service account credentials for anonymous contact submissions.                                                                                                                 |
| `OIDC_SERVICE_SCOPES`                                  | Approved anonymous-submission scopes. The example uses `inquiries.write`.                                                                                                               |
| `COOKIE_PASSWORD`                                      | Stable random secret of at least 32 characters for SDK cookies and encrypted session storage.                                                                                           |
| `COOKIE_NAME`                                          | Optional SDK cookie name override. Local HTTP and browser fixtures use a name without the secure host prefix; production uses the SDK default.                                          |
| `COOKIE_SECURE`                                        | Secure-cookie setting. The application rejects `false` in production. Local HTTP development uses `false`.                                                                              |
| `COOKIE_SAMESITE`                                      | SameSite setting, either `lax` or `strict`. Defaults to `lax`.                                                                                                                          |
| `SESSION_TTL_SECONDS`                                  | Session lifetime. The deployment uses `86400`; keep it within the platform refresh-token policy.                                                                                        |
| `REDIS_URL`                                            | Valkey connection URL, including its URL-encoded password. Required even when only configuring the BFF.                                                                                 |
| `WALLOW_TRUSTED_PROXIES`                               | SDK forwarded-header trust configuration. The deployment uses `private`; narrow it to known peers or CIDRs where possible.                                                              |
| `LOG_LEVEL`                                            | Pino logger level, defaulting to `info`.                                                                                                                                                |

`COOKIE_PASSWORDS` optionally replaces `COOKIE_PASSWORD` with a JSON object of key IDs to secrets for rotation. The first key is active; retain older keys while their sessions remain valid. Each secret needs at least 32 characters. Key IDs may contain letters, digits, and underscores, but cannot be all digits. `COOKIE_HOST_PREFIX=false` disables the default host prefix without disabling secure cookies. Production Compose passes neither override.

The app's session-store key prefix is `wallow:<BFF_APP_ID>`, with `bcordes` as the fallback when the SDK leaves the app ID unset. Avoid sharing an app ID between independent environments on the same store.

Only the original transport peer can establish proxy trust. The production `private` setting trusts private peers on the shared Docker network; it is not an authorization rule. See [authentication](authentication.md) for session and access behavior.

## Compose inputs and fixed settings

[Production Compose](../docker-compose.prod.yml) interpolates its managed environment explicitly. Setting an arbitrary variable in Dockhand does not automatically pass it to the web container.

| Input                    | Effect                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `BCORDES_IMAGE`          | Required tested image digest or full commit tag.                                                               |
| `BCORDES_DOMAIN`         | Defaults to `bcordes.dev`; sets the Pangolin domain and derives both OIDC redirect URLs with HTTPS.            |
| `VALKEY_PASSWORD`        | Required Valkey server password. Set the matching encoded password in `REDIS_URL`; Compose does not derive it. |
| `BFF_API_BASE_URL`       | Defaults to `http://wallow-api:8080`.                                                                          |
| `OIDC_METADATA_URL`      | Defaults to `http://wallow-api:8080/.well-known/openid-configuration`, even when the API origin changes.       |
| `OIDC_SERVICE_SCOPES`    | Defaults to `inquiries.write`.                                                                                 |
| `SESSION_TTL_SECONDS`    | Defaults to `86400`.                                                                                           |
| `WALLOW_TRUSTED_PROXIES` | Defaults to `private`.                                                                                         |

Compose fixes `BFF_APP_ID=bcordes`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax`, `NODE_ENV=production`, `HOST=0.0.0.0`, and `PORT=3000`. It derives `OIDC_REDIRECT_URI` and `OIDC_POST_LOGOUT_REDIRECT_URI` from the domain rather than accepting those variables directly. It does not pass `LOG_LEVEL` or `COOKIE_NAME`. Change the Compose definition to override these settings, including the app ID for staging.

Use `bcordes-session-store` as the production Valkey hostname. Its service joins only the private session network. [Local Compose](../docker-compose.yml) instead exposes Valkey on `127.0.0.1:6379` and defaults its password to `devpassword`.

## Build and tool variables

| Variable          | Use                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NODE_AUTH_TOKEN` | Dependency installation and Docker BuildKit secret only. Never pass it to the runtime container.                 |
| `ANALYZE`         | Any nonempty value enables the Vite bundle report at `apps/web/stats.html`, for example `ANALYZE=1 pnpm build`.  |
| `HOST`, `PORT`    | Built Nitro server address and port. The container defaults to `0.0.0.0:3000`; Vite's dev script sets port 3000. |
| `NODE_ENV`        | Runtime mode; production requires secure cookies and uses JSON logging.                                          |
| `IMAGE`           | Optional image tag used by `scripts/verify-docker.sh`. The script builds and verifies that image.                |

Browser-only fixture settings are documented in the [browser verification guide](../apps/web/e2e/README.md).
