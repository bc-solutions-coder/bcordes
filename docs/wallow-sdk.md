# Wallow SDK integration

bcordes pins `@bc-solutions-coder/sdk` 2.0.0 and `@bc-solutions-coder/api-errors` 1.0.0. Update the consuming workspace manifests and lockfile together when the corrected Wallow releases are available.

`packages/auth` contains the host BFF adapter and request-scoped SDK client. `packages/wallow` exposes the user/service client factories and derives feature DTOs from the published SDK. Inquiry and notification server functions call generated operations directly. Anonymous contact submission uses the SDK service client with a separate narrow grant.

Generated operations return data and throw the shared library's API failures. User-facing error messages use `resolveFailureMessage`; diagnostic transport errors must not be displayed directly. Query caches around transformed server-function results remain application-owned and must be invalidated alongside those feature functions.

The SDK proxies `/api/events?subscribe=Notifications,Inquiries`. Browser push is explicitly pending the corrected Wallow contract; no guessed subscription serialization or privileged service fallback is implemented. Preferences, inquiry SSE permissions and historical linking require the [tracked platform verification](https://github.com/bc-solutions-coder/bcordes/issues/31).

See [authentication](auth-walkthrough.md) and [deployment](../DEPLOYMENT.md).
