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
