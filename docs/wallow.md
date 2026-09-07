# Wallow SDK

Use generated Wallow operations in feature server functions. `@bcordes/wallow` provides client factories and application types; it does not duplicate the API as a handwritten client.

The workspace pins `@bc-solutions-coder/sdk` 2.0.0 and `@bc-solutions-coder/api-errors` 1.0.0. Update consuming manifests and `pnpm-lock.yaml` together when adopting a release. Check the [platform verification requirements](https://github.com/bc-solutions-coder/bcordes/issues/31) before treating a new version as deployment-ready.

## Call an operation

Authenticate in the server function, create the request client, then pass its `.client` to the generated operation. This is the pattern used by [notification server functions](../apps/web/src/features/notifications/server-fns/notifications.ts):

```ts
import { createServerFn } from '@tanstack/react-start'
import { notificationsGetUnreadCount } from '@bc-solutions-coder/sdk'
import { requireAuth } from '@bcordes/auth/middleware'
import { createWallowClient } from '@bcordes/wallow/client'

export const fetchUnreadCount = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    const sdk = await createWallowClient()
    const result = await notificationsGetUnreadCount({ client: sdk.client })
    return Number(result.count)
  },
)
```

Add input validation and resource authorization before mutations. See [authentication](authentication.md#protect-a-feature) for inquiry ownership and staff checks, and [development](development.md) for feature placement.

`createWallowClient()` delegates to the request-scoped auth adapter. For anonymous contact submissions only, [`getInquiryService()`](../packages/wallow/src/service-client.ts) uses the SDK service client and shared Valkey adapter. Its deployment grant must remain limited to inquiry submission. Do not use it to bypass a user's missing permission.

## Types, errors, and cached results

Import generated request and response types from the SDK. [`packages/wallow/src/types.ts`](../packages/wallow/src/types.ts) re-exports inquiry DTOs and defines the local event envelope and notification extensions. Derive types from the operation or published DTO before adding a parallel interface.

Generated operations return data and throw shared API failures. Use `isApiFailure()` when code needs to inspect a failure, such as a 401. UI error handlers use `resolveFailureMessage()` from `@bc-solutions-coder/api-errors`; do not display diagnostic transport messages directly.

The application owns caches of transformed server-function results. After a mutation, invalidate the corresponding TanStack Query keys or router loaders. Notification UI uses `invalidateNotifications(queryClient)` for its list and unread count. Inquiry routes use `router.invalidate()` to reload their data. An SDK call alone does not refresh these views.

See [notifications](notifications.md) for SSE subscriptions, query refresh behavior, and the pending browser-push contract. Runtime settings belong in [configuration](configuration.md), and external release checks in [deployment](deployment.md).
