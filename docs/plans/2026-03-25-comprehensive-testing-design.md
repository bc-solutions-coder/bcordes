# Comprehensive Testing Design

## Goals

1. **Confidence for refactoring** -- unit tests for server functions, hooks, utilities, and lib code
2. **Regression prevention** -- E2E tests for critical user flows

## Decisions

- **Wallow API in E2E**: Mock via Playwright route interception now; hybrid (mock + real backend) in CI later
- **Auth in E2E**: Bypass OIDC by injecting a sealed session cookie
- **CI**: Local-first; GitHub Actions workflow added as a separate future task

## Test Layers

### Unit/Integration Tests (Vitest + Testing Library)

Co-located `*.test.ts(x)` files next to source files.

**Priority order by risk/value:**

| Priority | Area                      | What to test                                                                       |
| -------- | ------------------------- | ---------------------------------------------------------------------------------- |
| 1        | `src/lib/wallow/`         | Client creation, token refresh, 401/429 retry logic, error wrapping to WallowError |
| 2        | `src/server-fns/`         | Inquiry CRUD, notification ops, auth guards (mock Wallow client)                   |
| 3        | `src/lib/auth/`           | Session sealing/unsealing, OIDC config, middleware auth guards                     |
| 4        | `src/lib/notifications/`  | Notification routing logic                                                         |
| 5        | `src/hooks/`              | useSignalR reconnect, usePushNotifications, useReducedMotion                       |
| 6        | `src/components/contact/` | ContactForm validation states and submission flow                                  |

### E2E Tests (Playwright)

Tests in `e2e/tests/` directory at project root.

**Priority order:**

| Priority | Flow               | What to verify                                 |
| -------- | ------------------ | ---------------------------------------------- |
| 1        | Contact form       | Fill form, submit, success state               |
| 2        | Public pages       | Home, About, Projects, Blog render correctly   |
| 3        | Dashboard (authed) | Inquiries list, detail view, status updates    |
| 4        | Notifications      | Bell indicator, notification center, mark read |

## Infrastructure

### Vitest Configuration

`vitest.config.ts` at project root:

- Environment: jsdom
- Path aliases: mirror `@/*` and `~/*` from tsconfig
- Setup file: `src/test/setup.ts`
- Coverage: v8 provider, output to `coverage/`

### Test Helpers

```
src/test/
  setup.ts              -- global mocks, testing-library cleanup
  mocks/
    wallow.ts           -- factory for mocking createWallowClient/createServiceClient
    auth.ts             -- fake session data, mock serverRequireAuth
  helpers/
    render.ts           -- wrapped render with TanStack Query provider
```

### Playwright Configuration

```
e2e/
  playwright.config.ts  -- Chromium only, baseURL localhost:3000, dev server auto-start
  fixtures/
    auth.ts             -- custom fixture injecting sealed session cookie
  mocks/
    api.ts              -- reusable Wallow API route handlers
  tests/
    contact.spec.ts
    public-pages.spec.ts
    dashboard.spec.ts
    notifications.spec.ts
```

### Auth Bypass Strategy (E2E)

Rather than going through the full OIDC flow, E2E tests inject a pre-sealed session cookie using iron-webcrypto with the same SESSION_SECRET used by the dev server. This gives tests a valid authenticated session without needing an identity provider.

### API Mocking Strategy (E2E)

Playwright's `page.route()` intercepts all requests to the Wallow API URL and returns canned JSON responses. Mock handlers are defined in `e2e/mocks/api.ts` and composed per-test. Future: a small smoke suite hits a real staging backend in CI.

## Future Work

- GitHub Actions workflow for running unit + E2E tests on PRs
- Hybrid E2E mode with real Wallow backend in CI
- Visual regression testing via Playwright screenshots
- Storybook interaction tests for component library
