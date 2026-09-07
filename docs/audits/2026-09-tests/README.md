# Test inventory and baseline

Evidence for [Establish the complete test inventory and fresh coverage baseline](https://github.com/bc-solutions-coder/bcordes/issues/47), part of [Plan a behavior-only test suite with meaningful 90% coverage](https://github.com/bc-solutions-coder/bcordes/issues/46).

## Snapshot

Recorded 2026-09-07 UTC at commit `990edf5a5ee6142dc8331d340c313e76f28e9a2d`, branch `main`, clean worktree before collection. Node `v24.11.1`, pnpm `10.28.2`, Vitest `3.2.4`; macOS with Docker available. No tests, application code, runner configuration, or coverage exclusions were changed. Generated build/runner output is not part of this committed evidence.

The installed pnpm emits a warning that the root manifest's `pnpm.overrides` setting is ignored. This is an environment observation, not a diagnosed cause of a test failure.

## Inventory assets

- [files.tsv](files.tsv): all 124 tracked test files, runner, declaration count, candidate signals, and pending disposition status.
- [titles.tsv](titles.tsv): 1,445 suite/test declarations, including 1,127 test declarations, with source lines, nested titles, and declaration modifiers.
- [assertions.tsv](assertions.tsv): 2,030 assertion call expressions with owning test or helper context and source lines. This is evidence for human review, not an assertion-quality score.
- [runtime-titles.tsv](runtime-titles.tsv): 1,298 expanded Vitest cases and 24 Playwright cases, reconciled against all 124 files. Vitest statuses use the second full run; Playwright statuses use the browser execution.
- [candidate-inspection.md](candidate-inspection.md): manual inspection of all 49 flagged files, with concrete evidence distinguishing source checks, command outcomes, and rendered behavior. Flags do not prescribe deletion.
- [coverage-summary.json](coverage-summary.json): fresh second-run totals and every measured file, with repository-relative paths.
- [run-summary.json](run-summary.json): counts from both full Vitest runs and the first failure's reporter evidence.
- [entry-points.md](entry-points.md): runner discovery, scripts, hooks, CI gates, and historical verification tools outside the test-file inventory.

There are 120 Vitest files and four Playwright files. No tracked test file was absent from runner results. No runtime cases were skipped or todo in these runs. Conditional suite declarations such as `describe.skipIf(!hasClaude)` remain visible in the static ledger; different environments can skip them. Parameterized declarations appear once in the static ledger and expand in runner output.

The collector recognizes the repository's `describe`, `it`, and `test` call chains through the TypeScript parser. It preserves template expressions without evaluating them. Assertion expressions inside helpers retain helper context; helper invocation and mocks still require reading the surrounding file. Runtime reconciliation establishes file completeness, not proof that every semantic assertion or indirect helper was extracted. It would need adjustment for new runner aliases or custom assertion APIs. It is an audit extractor, not a source test or a deletion rule.

## Executed baseline

| Command                                                                                               | Result                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run --coverage --reporter=json --outputFile=/tmp/bcordes-test-baseline.json`        | Exit 1; 1,297 passed, one failed, 120 files discovered.                                                                          |
| `pnpm exec vitest run apps/web/src/__tests__/home-feature-module.test.ts --reporter=verbose`          | Exit 0; all nine tests passed in isolation.                                                                                      |
| `pnpm exec vitest run --coverage --reporter=json --outputFile=/tmp/bcordes-test-baseline-repeat.json` | Exit 0; all 1,298 cases passed across 120 files.                                                                                 |
| `pnpm --filter bcordes exec playwright test --list --reporter=json`                                   | Exit 0; 24 cases across four files, no discovery errors.                                                                         |
| `pnpm build`                                                                                          | Exit 0; production artifact built.                                                                                               |
| `bash scripts/verify-production.sh`                                                                   | Exit 0; four public HTML pages and referenced CSS/JS assets returned successfully.                                               |
| `E2E_PORT=4517 pnpm --filter bcordes exec playwright test --reporter=json`                            | Exit 1; 23 passed, one failed, none skipped. Uses fixture backend and ephemeral Docker Valkey, not live identity-provider login. |

The first Vitest failure was the home feature named-export check at `apps/web/src/__tests__/home-feature-module.test.ts:85`. The JSON reporter returned `Error: STACK_TRACE_ERROR`. It did not reproduce in isolation or the repeated full run. [Investigate intermittent home feature export test failure under full coverage](https://github.com/bc-solutions-coder/bcordes/issues/54) tracks the unresolved cause and its relationship to later test disposition.

The browser failure was `Home Page > displays key statistics`, at `apps/web/e2e/tests/public-pages.spec.ts:32`. It expects visible `6+`; the current Hero renders `7+` for Years Experience. [Reconcile the homepage browser statistic expectation with current content](https://github.com/bc-solutions-coder/bcordes/issues/53) tracks that disagreement. No assertion was changed during collection.

## Coverage and limits

| Metric     | First run | Second run | Global target |
| ---------- | --------: | ---------: | ------------: |
| Lines      |    92.38% |     92.42% |           90% |
| Statements |    92.38% |     92.42% |           90% |
| Branches   |    90.11% |     90.09% |           90% |
| Functions  |    87.22% |     87.22% |           90% |

The second run covers 4,817 of 5,212 lines/statements, 637 of 707 branches, and 198 of 227 functions. At this denominator, seven additional covered functions would reach 90%; meaningful replacements can change the denominator. No claim is made that these seven functions are the right tests to add. The function shortfall predates cleanup. Branch coverage has little headroom.

Root V8 coverage includes `apps/*/src/**/*.{ts,tsx}` and `packages/*/src/**/*.{ts,tsx}`. It excludes `**/*.test.{ts,tsx}`, stories, generated route trees, `types.ts`, and `packages/ui/src/components/**`. Consequently, valuable UI primitive tests do not contribute primitive implementation coverage to these totals. Build tooling and root package configuration are outside the include scope; testing helpers under `src` can be included. Vitest coverage does not incorporate browser execution. The first run counted 708 branches and the second 707; preserve both observations rather than claiming an identical denominator.

No numeric threshold is configured in root/project Vitest configs or a separate CI coverage gate. CI runs coverage and uploads its report. [Decide how cleanup will preserve and enforce meaningful coverage](https://github.com/bc-solutions-coder/bcordes/issues/49) owns the enforcement and shortfall decisions. Percentages do not establish whether tests assert valuable behavior.

## Reproduce the inventory

From the repository root, with existing dependencies installed:

```sh
node docs/audits/2026-09-tests/inventory.mjs
pnpm exec vitest run --coverage --reporter=json --outputFile=/tmp/bcordes-vitest.json
pnpm --filter bcordes exec playwright test --list --reporter=json > /tmp/bcordes-browser-list.json
node docs/audits/2026-09-tests/inventory.mjs /tmp/bcordes-vitest.json /tmp/bcordes-browser-list.json
```

The generator replaces the three static TSV files and, when runner reports are provided, the runtime ledger. Run it in a clean review checkout to compare snapshots; preserve later disposition work separately. A list-only browser report establishes discovery, not passing browser behavior. For execution, build first and use the browser command above. Some package managers append their own failure footer after a JSON report; extract the JSON object before passing such a report to the generator.

The generator ran twice with identical output hashes after formatting. All 124 files reconciled against expanded runner results. The collector passed ESLint; the changed Markdown and script passed Prettier, and documentation links passed the repository checker. The remaining behavior review is deliberately pending.
