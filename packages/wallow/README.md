# @bcordes/wallow

Authenticated HTTP client for the Wallow .NET backend API.

- `createWallowClient()` — per-request, user-authenticated client with automatic
  OIDC token refresh and retry on 401/429. Reads the caller's sealed session via
  `@bcordes/auth`.
- `serviceClient` — machine-to-machine client using the OAuth2 client-credentials
  grant, with token caching + a distributed refresh lock in Valkey.
- Errors are returned as RFC 7807 ProblemDetails and wrapped in `WallowError`
  (`isWallowError` narrows unknown values).

## Environment variables

The package reads its configuration from `process.env` at runtime; nothing is
passed in from the host app.

| Variable                     | Required by         | Purpose                                            |
| ---------------------------- | ------------------- | -------------------------------------------------- |
| `WALLOW_API_URL`             | `config.ts` (all)   | Base URL of the Wallow backend API.                |
| `OIDC_ISSUER`                | `service-client.ts` | OIDC issuer used for client-credentials discovery. |
| `OIDC_SERVICE_CLIENT_ID`     | `service-client.ts` | Client ID for the service account.                 |
| `OIDC_SERVICE_CLIENT_SECRET` | `service-client.ts` | Client secret for the service account.             |
