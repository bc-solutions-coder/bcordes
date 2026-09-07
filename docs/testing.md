# Testing

Run commands from the repository root after [setup](setup.md).

## Choose a check

| Command                                              | Checks                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm test`                                          | All Vitest workspace projects                                     |
| `pnpm exec vitest run apps/web/src/features/contact` | Tests matching one feature path                                   |
| `pnpm exec vitest run --coverage`                    | Workspace tests and coverage reports in `coverage/`               |
| `pnpm typecheck`                                     | TypeScript in every workspace package                             |
| `pnpm lint`                                          | Shared ESLint rules, including module boundaries                  |
| `pnpm exec prettier --check docs/development.md`     | Formatting for a specific file                                    |
| `python3 scripts/check-docs.py`                      | Local documentation links and heading anchors                     |
| `pnpm build`                                         | Production app build                                              |
| `bash scripts/verify-production.sh`                  | Built server, public HTML pages, and referenced CSS and JS assets |

`pnpm format` rewrites formatting across the repository. `pnpm check` also runs ESLint with fixes. Use file-specific checks when reviewing a small change. The [pre-commit hook](../.husky/pre-commit) runs `lint-staged`; it does not replace tests or type checking.

If Node exhausts its heap during lint, retry with `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`.

## Write behavior tests

Place `*.test.ts` and `*.test.tsx` beside the behavior they exercise. The [root Vitest config](../vitest.config.ts) discovers projects under `apps/*` and `packages/*`; each project selects its environment and setup. The [web project](../apps/web/vitest.config.ts) uses jsdom and `@bcordes/test-utils/setup`.

Use Testing Library for rendered behavior and ordinary Vitest tests for pure logic and public APIs. [renderWithProviders](../packages/test-utils/src/render.tsx) supplies a fresh React Query client with retries disabled. It does not provide a router or authenticated session; provide those only when the test needs them.

Test success, failure, and access boundaries that matter for the change. Server-function tests should exercise validation and authorization as well as the backend call. Do not add assertions against raw source text or implementation structure unless explicitly requested. Existing source tests are not the default pattern for new tests.

Coverage excludes stories, tests, generated routes, `types.ts`, and UI primitive source. A coverage report does not establish that every behavior or external integration was tested.

## Verify the production app

Build first, then run `bash scripts/verify-production.sh`. The [script](../scripts/verify-production.mjs) starts the built Node server with synthetic settings and unreachable external services. It verifies public page responses and nonempty CSS and JavaScript assets. To check an already-running server, pass its URL:

```sh
bash scripts/verify-production.sh http://127.0.0.1:3000
```

The [browser verification guide](../apps/web/e2e/README.md) owns Playwright commands, ports, Valkey setup, and fixture behavior. The suite runs the production artifact against a controlled backend. Its login checks stop at the identity-provider redirect; it does not authenticate against live OIDC or establish live Wallow compatibility.

For Docker build and runtime changes, run `bash scripts/verify-docker.sh` with Docker available and `NODE_AUTH_TOKEN` exported. It builds the image using a secret mount, starts a disposable Valkey container, and checks the same image under two runtime redirect configurations. See [deployment](deployment.md) for release checks and the outstanding platform verification gate.

## Match CI

[CI](../.github/workflows/ci.yml) runs Vitest with coverage, lint, recursive type checking, a production build, production smoke checks, and Chromium browser flows. Browser failures upload `apps/web/e2e/test-results/`; coverage uploads separately. CI uses Node 24 and the package manager version declared in the root manifest.

Run the checks affected by a change before handing it off. A passing fixture suite proves behavior against those fixtures; external platform registration, credentials, and deployed API contracts still need the [deployment checks](deployment.md).
