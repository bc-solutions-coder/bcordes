# @bcordes/wallow

Client factories and application types for the published Wallow SDK.

- `createWallowClient()` creates a client for the current user request through the SDK BFF.
- `getInquiryService()` creates the shared service client for anonymous inquiry submissions.
- `types` exports SDK-derived inquiry and notification types plus local event types.

See [Wallow SDK usage](../../docs/wallow.md) for operations, errors, and cache updates; [authentication](../../docs/authentication.md) for access checks; and [configuration](../../docs/configuration.md) for runtime settings.
