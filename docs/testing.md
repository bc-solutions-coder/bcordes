# Testing

Run commands from the repository root after [setup](setup.md).

## Choose a check

| Command                                              | Checks                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm test:verification`                             | Production/Docker CLI contracts and release-tag output files      |
| `pnpm verify:storybook`                              | Built package story discovery and rendered Button usability       |
| `pnpm test`                                          | All Vitest workspace projects                                     |
| `pnpm exec vitest run apps/web/src/features/contact` | Tests matching one feature path                                   |
| `pnpm exec vitest run --coverage`                    | Workspace tests and coverage reports in `coverage/`               |
| `pnpm typecheck`                                     | TypeScript in every workspace package                             |
| `pnpm lint`                                          | Oxlint typed rules, JS plugins and module boundaries              |
| `pnpm format:check`                                  | Oxfmt formatting without modifying files                          |
| `python3 scripts/check-docs.py`                      | Local documentation links and heading anchors                     |
| `pnpm build`                                         | Production app build                                              |
| `bash scripts/verify-production.sh`                  | Built server, public HTML pages, and referenced CSS and JS assets |

`pnpm format` rewrites formatting with Oxfmt. `pnpm check` also runs Oxlint with fixes. Use `pnpm exec oxfmt --check <path>` for a file-specific check. The [pre-commit hook](../.husky/pre-commit) runs Oxfmt and the active linter through `lint-staged`; it does not replace tests or type checking.

Oxfmt preserves single quotes, no semicolons, trailing commas and an 80-column
width. Import, package-key and Tailwind-class sorting are disabled. Lockfiles
and generated Storybook output retain their formatting exclusions. Configure
your editor's [Oxc formatter integration](https://oxc.rs/docs/guide/usage/formatter/editors.html)
to use the repository's `.oxfmtrc.json`; remove any workspace Prettier formatter
selection. CI runs the non-mutating `pnpm format:check` gate.

The root lint command enables native typed checks and the configured JS plugins.
CI uses the same command. Generated `apps/web/storybook-static/` output is ignored by lint,
formatting and Git, so building Storybook does not change source checks.

## Write behavior tests

Place `*.test.ts` and `*.test.tsx` beside the behavior they exercise. The [root Vitest config](../vitest.config.ts) discovers projects under `apps/*` and `packages/*`; each project selects its environment and setup. The [web project](../apps/web/vitest.config.ts) uses jsdom and `@bcordes/test-utils/setup`.

Use Testing Library for rendered behavior and ordinary Vitest tests for pure logic and public APIs. [renderWithProviders](../packages/test-utils/src/render.tsx) supplies a fresh React Query client with retries disabled. It does not provide a router or authenticated session; provide those only when the test needs them.

Test success, failure, and access boundaries that matter for the change. Server-function tests should exercise validation and authorization as well as the backend call. Do not add assertions against raw source text or implementation structure unless explicitly requested. Existing source tests are not the default pattern for new tests.

The workspace integration cases start disposable `valkey/valkey:8-alpine` containers on random loopback ports. Run the Docker engine before the unit/coverage command; each case file owns and removes its server. These tests use synthetic sessions and controlled HTTP responses, with no live identity provider or production credentials.

Coverage excludes stories, tests, generated routes, `types.ts`, and UI primitive source. A coverage report does not establish that every behavior or external integration was tested.

## Verify the production app

Build first, then run `bash scripts/verify-production.sh`. The [script](../scripts/verify-production.mjs) starts the built Node server with synthetic settings and unreachable external services. It requires each public route to serve its expected heading with direct HTTP 200 and HTML content type. It samples the first referenced CSS and JavaScript assets and requires direct HTTP 200, the matching content type and a nonempty body; asset redirects fail. This does not enumerate all lazy-loaded chunks. Run `pnpm test:verification` to exercise the CLI success, failure, deadline and cleanup contracts against controlled HTTP inputs. CI runs the same standalone checks. To check an already-running server, pass its URL:

```sh
bash scripts/verify-production.sh http://127.0.0.1:3000
```

The [browser verification guide](../apps/web/e2e/README.md) owns Playwright commands, ports, Valkey setup, and fixture behavior. The suite runs the production artifact against a controlled backend. Its login checks stop at the identity-provider redirect; it does not authenticate against live OIDC or establish live Wallow compatibility.

For Docker build and runtime changes, run `bash scripts/verify-docker.sh` with Docker available and `NODE_AUTH_TOKEN` exported. It builds the image using a secret mount, starts a disposable Valkey container, and pins its image ID and checks public serving under two callback/logout URL configurations. Readiness requires direct HTTP 200, limits each request to two seconds, and stops after an overall 30-second deadline. `VERIFY_READINESS_TIMEOUT_MS` can shorten the deadline for isolated failure checks. The loop does not exercise login, callbacks or logout. Use `bash scripts/verify-docker.sh --image <local-image>` to check an already-built image without registry credentials. PR runtime verification uses that path. See [deployment](deployment.md) for release checks.

## Verify built Storybook and release tags

Run `pnpm --filter bcordes build-storybook`, then `pnpm verify:storybook`. Chromium must be installed with `pnpm --filter bcordes exec playwright install chromium`. The probe serves the static artifact on an ephemeral loopback port, finds UI/Button Default through its emitted index, and checks the rendered frame has a visible, enabled Button that accepts focus on click. It closes the browser and preview server afterward. Compilation and runtime verification are separate CI steps; this is one story, not exhaustive component coverage.

`pnpm test:verification` also executes [release-tag-outputs.sh](../scripts/release-tag-outputs.sh), which the release workflow uses directly. The two accepted tag inputs must write exact version, major and minor values to temporary output files. These checks do not publish a release or define malformed-tag behavior.

## Match CI

[CI](../.github/workflows/ci.yml) runs Vitest with coverage, lint, recursive type checking, a production build, production smoke checks, Chromium browser flows, a static Storybook build, and its rendered package story. Standalone CLI checks also exercise both supported release-tag examples through the shared workflow script. Browser failures upload `apps/web/e2e/test-results/`; coverage uploads separately. CI uses Node 24 and the package manager version declared in the root manifest.

Run the checks affected by a change before handing it off. A passing fixture suite proves behavior against those fixtures; external platform registration, credentials, and deployed API contracts still need the [deployment checks](deployment.md).
