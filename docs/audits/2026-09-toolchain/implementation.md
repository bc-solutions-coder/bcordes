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
