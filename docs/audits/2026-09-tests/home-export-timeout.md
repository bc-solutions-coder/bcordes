# Home export timeout investigation

Investigation for [#54](https://github.com/bc-solutions-coder/bcordes/issues/54),
against `e8e6325`. The original intermittent failure remains recorded in
[run-summary.json](run-summary.json). This change does not delete or reclassify
the test; [#70](https://github.com/bc-solutions-coder/bcordes/issues/70) still owns
its behavior-review disposition.

## Evidence

The original local JSON reports survived at `/tmp/bcordes-test-baseline.json`
and `/tmp/bcordes-test-baseline-repeat.json`. The named-export assertion took
5114.209 ms when it failed and 2112.083 ms when it passed. These temporary paths
are provenance, not durable report links.

The installed Vitest 3.2.4 runner creates `STACK_TRACE_ERROR` at test declaration
time. Its `withTimeout` calls `makeTimeoutError`, which sets a timeout message
but copies the declaration stack containing that placeholder. The JSON reporter
therefore obscures the timeout reason in `failureMessages`.

The unchanged focused coverage run passed all nine tests, with the export
assertion taking 726 ms. Running it with `--testTimeout=100` and both verbose
and JSON reporters failed only that assertion, taking 427.593 ms. Verbose output
reported `Test timed out in 100ms`; JSON reported `Error: STACK_TRACE_ERROR`.
This reproduces the timeout signature under a controlled smaller budget, not
the original full-suite scheduling conditions.

Together, the original duration and controlled reproduction strongly support
timeout as the original failure mechanism. They do not establish why that baseline
run loaded the dependency graph more slowly.

## Change and defect check

Import the home namespace during test collection, as ordinary component tests
do, instead of dynamically loading its dependency graph inside the timed test.
Keep all four function-export assertions. No timeout increase, retry, mock,
source assertion, or coverage configuration change was added.

With this change, the same 100 ms focused coverage command passed all nine
tests; the export assertion rounded to 0 ms. Temporarily removing the
`SkillsShowcase` re-export and running only the public-API case failed with
`expected 'undefined' to be 'function'`. The production export was restored
immediately afterward. Missing exports remain detectable at runtime; typecheck
also validates the namespace keys.

## Verification commands

```sh
pnpm exec vitest run apps/web/src/__tests__/home-feature-module.test.ts --coverage --reporter=verbose
pnpm exec vitest run apps/web/src/__tests__/home-feature-module.test.ts --coverage --testTimeout=100 --reporter=verbose --reporter=json --outputFile.json=/tmp/bcordes-54-after.json
pnpm exec vitest run apps/web/src/__tests__/home-feature-module.test.ts -t 'the public API resolves' --reporter=verbose
pnpm typecheck
pnpm exec vitest run --coverage --reporter=verbose --reporter=json --outputFile.json=/tmp/bcordes-54-full.json
```

The public-API-only command above is the deliberate missing-export probe and
was expected to fail. Workspace typechecking, focused ESLint, and test-file
formatting checks passed. Full coverage passed all 1298 tests in 120 files.
The export assertion took 0.134 ms. Coverage was 92.42% lines/statements,
87.22% functions, and 90.11% branches. The pre-existing function-coverage
shortfall remains outside this fix; no cleanup coverage gate is claimed.
This single full-suite pass verifies the change against the suite; it does not
prove that every possible intermittent failure has been eliminated.
