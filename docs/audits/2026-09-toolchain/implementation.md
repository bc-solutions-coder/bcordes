# Toolchain implementation evidence

Execution of [#52](https://github.com/bc-solutions-coder/bcordes/issues/52).
The [original baseline](README.md) remains historical evidence, including its
failures and timing limitations. Results below do not replace that record.

## Green starting point, #71

Revision `dd17d4f`, Node 24.11.1, pnpm 10.28.2, macOS arm64. The repository was
clean after the baseline fixes. Docker verification used the local Linux arm64
engine and disposable Valkey. Registry authentication and Chromium were already
available. These were warm local checks, not controlled CI timing samples.

- #53 updated the browser statistic assertion to the intentional 2026 content.
- #54 moved dependency loading outside the export assertion timeout; its
  controlled timeout and missing-export evidence is recorded in
  [the investigation](../2026-09-tests/home-export-timeout.md).
- #79 makes the documented 8 GiB typed ESLint heap allowance part of the root
  command used by CI. This establishes a supported resource requirement, not
  a memory optimization.
- #80 reproduced five parser errors after Storybook build, then verified lint
  passes with generated output retained and excluded from lint, formatting and
  Git. Source lint rules remain unchanged.

| Command                                                                    | Result                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| `pnpm install --frozen-lockfile`                                           | Passed, warm installation                       |
| `pnpm lint`                                                                | Passed with generated Storybook output retained |
| `pnpm typecheck`                                                           | Passed across workspaces                        |
| `pnpm exec vitest run packages/config/config.test.ts --reporter=verbose`   | Passed                                          |
| `pnpm exec vitest run --coverage`                                          | 120 files, 1298 tests passed                    |
| `pnpm build`                                                               | Passed                                          |
| `bash scripts/verify-production.sh`                                        | Passed                                          |
| `E2E_PORT=4517 pnpm --filter bcordes exec playwright test --reporter=line` | 24 passed                                       |
| `pnpm --filter bcordes build-storybook`                                    | Passed                                          |
| `bash scripts/verify-docker.sh`                                            | Passed, native arm64 runtime checks             |

Function coverage remains below 90%, owned by #46 and its accepted coverage
plan. No thresholds or exclusions changed. A passing starting matrix does not
certify that coverage target or live Wallow/OIDC behavior. Baseline timing
limitations remain relevant to #61; no speedup is claimed here.

## Node and package manager alignment, #56

The user approved pnpm 11 during execution, superseding the original pnpm 10
restriction. Target versions are Node 24, `@types/node` 24.13.3 and pnpm
11.26.0. Local execution uses Node 24.11.1. Runtime declarations, Docker and
developer guidance now agree. CI receives the private-registry configuration
path created by setup-node through `PNPM_CONFIG_USERCONFIG`.

Following the [pnpm migration guide](https://pnpm.io/migration), overrides moved
unchanged from package.json into pnpm-workspace.yaml. The clean v11 install
initially rejected the existing private packages because they were less than
one day old. Exact exceptions cover API errors 1.0.0 and SDK 2.0.0 only;
their versions are unchanged. Explicit build permissions cover esbuild and
unrs-resolver's native installation scripts. Other release-age and build
defaults remain intact.

pnpm 11 exposed two recursive-task cycles. test-utils had unused dependencies
on query and ui, while those packages used test-utils for testing. Its actual
render helper imports TanStack Query directly. Removing those two dependencies
and the obsolete manifest-only case restores recursive typechecking without
disabling cycle detection. #60 and #66 record the ownership handoff; the suite
has one fewer case, with no rendered-behavior assertion removed.

The temporary CSS build test also failed because pnpm 11 refuses to write task
state into symlinked node_modules. It now invokes the installed Vite CLI with
Node in the same temporary app directory. Its isolation and all assertions
remain unchanged, and the focused CSS/workflow run passed all 21 cases. #70
records this launcher change for the later test review.

The pre-existing eslint-plugin-import-x peer range does not include installed
ESLint 10.1.0. Its removal/replacement remains owned by #57; this slice does not
claim a peer-clean lint stack.

Final verification passed frozen installation, every workspace typecheck,
lint, 1297 tests in 120 files, production build/smoke, all 24 browser cases,
and native Docker build/runtime verification. The Docker dependency layer
performed a fresh pnpm 11 install, including authenticated private packages.

### Additional export timeouts, #83

Full verification first exposed a 5000 ms timeout in contact's export check,
then in about, app-shell and notifications. These tests loaded their dependency
graphs inside timed assertions, the same mechanism addressed for home in #54.
The remaining eight module-export tests now use static namespace imports.
All export lists, runtime assertions, mocks and timeout values are preserved.
The focused eight-file run passed all 187 cases with a 100 ms test timeout;
workspace typechecking also passed. The original failed full runs are recorded
on #83, and #70 still owns the tests' eventual disposition.

## Storybook and test runner, #73

Pinned Storybook and its React/Vite framework to `11.0.0-alpha.0`, the approved
next exception. Vitest and coverage-v8 are matched at 5.0.0. This arrangement
works with the existing Vite 7.3.1 and TypeScript 5.9.3, so no compatibility
grouping with Vite 8 was necessary.

The first full run failed 26 cases because Redis, EventSource and
BroadcastChannel constructor mocks used arrow functions. Vitest now constructs
mock implementations with `new`. Changing those mocks to ordinary functions
preserved their returned objects and all behavior assertions; all 33 focused
cases passed, followed by all 1297 tests in 120 files with coverage.

The static Storybook build passed and is now part of CI's build job. Browser
verification of the development server rendered the Button story without page
errors, changed its variant through Controls to match the Destructive story's
computed color, and verified the disabled control disables the rendered button.
The current story inventory has no standalone docs entry. The configuration
has no docs add-on; the story's autodocs tag alone does not publish a docs page.
The default docgen preset is react-docgen, and the framework dynamically loads
the TypeScript docgen plugin only when selected. No TS6 fallback was introduced;
the actual TS7 check remains #57.

### Coverage measurement transition

[coverage-vitest5.json](coverage-vitest5.json) includes exactly the same 102
source paths as the original coverage snapshot. No coverage configuration,
exclusion or threshold changed. The
[Vitest migration guide](https://v4.vitest.dev/guide/migration#v8-code-coverage-major-changes)
explains the newer AST-based remapping and removal of non-executable lines.
For example, Hero has five executable lines in the new report versus 108 lines
in the old report; its new report also counts the map callback as a function.

New totals: 83.13% statements, 75.74% branches, 84.19% functions and 84.20%
lines. These are not directly comparable with v3 percentages and do not meet
the future cleanup's 90% gate. #46 records the revised measurement and retains
ownership of that shortfall. Passing tests is not a coverage-target claim.

## Oxfmt, #72

Replaced direct Prettier tooling with Oxfmt 0.67.0 in commands and staged
hooks, added a non-mutating CI formatting gate, and documented editor setup.
The configuration preserves no semicolons, single quotes, trailing commas,
80 columns, and lockfile/generated Storybook exclusions. Import, package-key
and Tailwind-class sorting are explicitly disabled. pnpm recorded exact
release-age exceptions for this release and its platform bindings.

Temporary JS/TS, JSON, YAML, CSS and Markdown fixtures produced the expected
formatting and passed a second, non-mutating check. Import and package-key
order stayed unchanged. An explicitly supplied ignored lockfile stayed byte
identical with the staged hook's no-error-on-unmatched-pattern option. The
repository check retained generated Storybook output without formatting it.

All 1297 tests, workspace typechecks, lint and format:check passed. Only four
existing files required formatting changes; those are committed separately.
Both standards and spec reviews reported no implementation findings.

## Vite, routing and Nitro, #58

Vite 8.2.2 uses integrated Rolldown with React plugin 6.1.1. Start 1.168.50,
Router 1.170.33, router-plugin 1.168.36 and their workspace peers now agree on
Router Core 1.171.28. Removed the old Router/Core overrides. The Seroval
override forced 1.5.1 below Router's required ^1.6.2 and caused an SSR
`ctx.addCleanup` failure; removing it resolves Seroval 1.6.4.

Nitro is pinned to the approved 3.0.260903-beta. Its build mixed bundled React
with an external React instance used by the store shim, causing invalid-hook
errors during SSR. React and React DOM now remain external and are explicitly
traced into the portable output. Local production and isolated Docker checks
verify that configuration. The server entry remains `.output/server/index.mjs`.
The production verifier accepts Nitro's added colon in its listening message.

Tailwind and its Vite plugin moved together to 4.3.3 because the old plugin
excluded Vite 8. React Query/Devtools moved to 5.102.8 because the SSR query
adapter 1.167.2 requires Query >=5.102.0. #59 and #74 record that coordination.
React itself and the other TanStack libraries remain separate work.

App, Vitest and Storybook use native tsconfig aliases. Storybook has its own
small Vite config: inheriting app server plugins caused Start's manifest plugin
to reject Storybook's multiple entries. Both direct alias-plugin dependencies
were removed after development, production, test and story resolution passed.
The alias test resolves a real module; the SSR query fixture now dehydrates a
real QueryClient into the adapter's new query.initial/query.stream envelope.
All existing behavior assertions remain. The regenerated route tree retains
the same route inventory and hierarchy.

Verification passed 1297 coverage tests, all typechecks, application and static
Storybook builds, four-page production smoke checks, all 24 browser tests, and
Docker runtime checks under both redirect configurations. Development app and
Button story rendered without browser page errors. The analysis build produced
a 1.19 MB stats.html; the existing visualizer remains compatible. A direct
warning-handler probe preserved suppression of dependency-only unused imports
and forwarding of application and unrelated warnings. The sole remaining peer
warning is the pre-existing ESLint/import-x mismatch owned by #57.

## React and visual verification, #59

React and React DOM are matched at 19.2.8 across all six consumers; their
types are 19.2.18 and 19.2.7. Existing ^19.2.4 workspace peers accept the new
patch release. No compiler plugin, application code or styles changed.
Tailwind 4.3.3 was verified in the prerequisite Vite slice.

All 1297 tests, lint, workspace types, production build/smoke, 24 browser
tests and static Storybook build passed. Browser probes filled the contact
form, inspected desktop and 390-pixel mobile layouts, checked no horizontal
overflow, and opened/closed the mobile navigation dialog. Screenshots showed
the expected green theme, form layout and navigation sheet; the computed
primary token was oklch(39% .11 142). Static Storybook's Button controls changed
the destructive variant and disabled the button. Neither browser probe reported
a page error. Shared-package class discovery remains covered by the passing
CSS build test.

Review found old React 19.2.4 peer graphs in auth and Wallow. pnpm dedupe
removed those and other older compatible duplicate packages without adding
any versions. The final graph contains only React/React DOM 19.2.8. Full
types, lint, 1297 tests, app build/smoke, 24 browser tests, Storybook and Docker
verification passed again; the reviewer confirmed the finding resolved.

## Docker dependency layers, #75

The base stage now copies only workspace manifests before installation; the
builder inherits that stage and copies source afterward. All 13 package
manifests plus the app manifest are present. Added-workspace maintenance is
documented. The obsolete source assertion requiring blanket package copying
was removed; 17 focused infrastructure tests pass.

[Cache measurements](docker-cache-results.json) used isolated temporary
contexts and two new docker-container builders with linux/arm64. Cold dependency
build/export took 107.05 seconds, including builder bootstrap and base-image
pull. A fresh builder imported the local-backend cache in 9.09 seconds with
the install layer cached. A source-only mutation took 0.37 seconds and retained
the cache hit. Manifest metadata and lockfile comment mutations invalidated
installation, taking 26.20 and 14.19 seconds. The fresh builder's first reinstall
had zero pnpm-store reuse, confirming the exported layers did not transfer its
cache mount. These are local dependency-stage measurements, not matched PR
completion measurements or a claim of GitHub cache reuse.

Both GitHub workflows now use the bcordes-docker cache scope with mode=max.
Actual GitHub cross-run reuse remains part of #76/#61 verification.

All 1289 remaining tests, workspace types, lint, formatting and Docker
production runtime checks pass. Actionlint validates both cache workflow edits.
Both review axes reported no implementation findings.
