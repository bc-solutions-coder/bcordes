# @bcordes/wallow

Wallow SDK clients and application-facing types.

- `createWallowClient()` creates a request-scoped SDK client through the SDK BFF and the current user session.
- `getInquiryService()` uses the SDK service client and shared Valkey adapter for anonymous inquiry submissions.
- Inquiry and notification DTOs come from `@bc-solutions-coder/sdk`. User-facing errors use `@bc-solutions-coder/api-errors`.

See [SDK integration](../../docs/wallow-sdk.md) for request ownership and [deployment](../../DEPLOYMENT.md) for runtime configuration and release gates.
