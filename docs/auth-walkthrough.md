# Wallow authentication

Wallow is bcordes' identity provider. The published SDK owns OIDC, PKCE/state verification, session cookies, server-side session storage, refresh locking, logout and back-channel revocation. The previous custom implementation has been removed.

The host mounts SDK handlers under `/bff/*`. Browser sign-in uses `/bff/login`; sign-out calls the SDK's CSRF-aware `logout()` helper. `/auth/me` is an application profile adapter, combining the session organization with the API's current-user profile and expanded permissions.

Each server request creates its own SDK client. It forwards that request's cookies through the SDK proxy in process, preserving the transport peer for trusted forwarding. No authenticated SDK client is shared across users. Valkey stores SDK sessions; the application requires `REDIS_URL` and does not fall back to cookie-only storage.

The public API mount exposes only the configured event stream and readiness endpoint. Feature server functions own the remaining product authorization. Customers can read/comment on their own inquiries, and receive no internal comments. Staff authorization uses the API-expanded `InquiriesRead` capability. A literal role name or an OAuth scope string alone does not grant that access.

The SDK validates CSRF at its own mutation boundary. Remaining application mutations require an Origin matching the configured public callback origin. Response headers protect against framing and MIME sniffing and constrain objects/base URLs. The CSP does not yet restrict scripts with nonces.

See [deployment instructions](../DEPLOYMENT.md) for registration, secrets and operational verification. The [integration contract](https://github.com/bc-solutions-coder/bcordes/issues/26) defines release requirements; local builds do not certify the deployed IdP or the pending platform features.
