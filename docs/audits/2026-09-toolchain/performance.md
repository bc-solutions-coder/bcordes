# Migration performance measurement

Evidence for [#61](https://github.com/bc-solutions-coder/bcordes/issues/61).
The application and workflow revision under measurement is `366b5ed`.
The measured documentation PR #85 changes neither application code nor workflow
commands. The separate #86 release-output correction is outside that measured
revision and does not change CI or Docker validation commands.

## Sample definitions

Measure three current PR attempts at the same documentation revision, pairing CI
and Docker validation by revision and attempt. Include the deploy-gate job when
calculating observed completion. Keep conclusions for every selected attempt;
a skipped or failed check is not passing evidence. This measures automated checks,
not human review or merge time.

Measure three main CI/publication pairs at the integrated application revision.
The first is the original push; the next two repeat the same CI run. Each
publication must complete before another main CI repetition starts. Publication
is image availability, not proof of an external production rollout.

The historical baseline remains in [the baseline report](README.md). It has
four matched PR samples, only two of which used the recent workflow. Its source
revisions differ from the upgraded sample and some runs include rerun waiting.
Report this mismatch rather than claiming a controlled before/after trial.

Separate elapsed attempts, initial scheduling delay and execution spans. Inspect
cache restoration and BuildKit reuse in logs; do not infer a cold cache from the
absence of a hit. The existing [Docker cache experiments](docker-cache-results.json)
provide controlled dependency-layer invalidation evidence; no shared caches are
cleared for this measurement.

## Known outlier

The initial upgraded CI run
[34145664547](https://github.com/bc-solutions-coder/bcordes/actions/runs/34145664547)
spent 559 seconds in Chromium installation. The log records 537 seconds fetching
21.1 MB of Ubuntu font dependencies. The app build took six seconds. Retain this
run in the sample; a JavaScript task-output cache does not solve that network
bottleneck.

## Decision criteria

Target at least 25% lower median PR completion time, while reporting sample sizes,
workflow differences and any shortfall. Evaluate remaining repeated work after
Docker reuse. Do not add package compilation layers just to produce cacheable
outputs, cache publication side effects, or skip quality gates. Turbo or another
task cache needs measured benefits that justify its inputs, outputs, environment
keys and invalidation complexity.

## Results

[Attempt records](performance-attempts.json) retain 19 explicitly selected
attempts, job/step timing, conclusions, runner images and cache evidence.
[Calculated pairs](performance-summary.json) identify each paired run and the
formula inputs. Every selected attempt succeeded; no failures were discarded.
The upgraded PR samples come from [draft PR #85](https://github.com/bc-solutions-coder/bcordes/pull/85).

| Measurement                  | Before                                        | After                               | Observed median change |
| ---------------------------- | --------------------------------------------- | ----------------------------------- | ---------------------- |
| Recent PR check completion   | 499, 311 s; median 405 s (n=2)                | 110, 107, 137 s; median 110 s (n=3) | 72.8% lower            |
| CI through image publication | 641, 468, 692, 569, 579 s; median 579 s (n=5) | 919, 174, 158 s; median 174 s (n=3) | 69.9% lower            |

The observed PR median exceeds the 25% improvement target. This is a small
observational comparison, not a controlled five-run before/after proof. Each PR
pair matches CI and Docker at the same SHA and attempt; the before and after
source revisions differ. The after workflow also adds formatting and Storybook
checks and uses the approved native image build/runtime path. The two older July
PR samples remain in the historical report but are excluded from the recent
comparison. The original 628-second historical span includes rerun waiting;
reconstructing its latest attempts produces 499 seconds. No rerun waiting is
charged to execution time.

For PR pairs, elapsed time runs from the earliest attempt start to the last job
completion. Initial scheduling delays are 4/3 seconds before and 3/4/4 seconds
after. Execution spans are 495/308 seconds before and 107/103/133 seconds after.
These spans include inter-job gaps; start delay is not pure runner queue time.
The after deploy-gate passes and does not extend the critical path; before
samples only captured CI and Docker. These figures do not measure review, merge,
manual release approval or external rollout.

After publication attempts take 304/40/24 seconds, with initial delays of
22/4/3 seconds and execution spans of 282/36/21 seconds. The original 919-second
CI-to-publication outlier is retained. Main CI and publication are paired by SHA
and sequential timing, not a verified trigger-run ID. Historical publication
ends at the API update timestamp; current measurements end at last job completion.
Second-resolution timestamps and that endpoint difference limit precision.

## Cache evidence

All three upgraded PR CI attempts restore all four pnpm caches. Docker PR
attempts report 20/23/23 cached BuildKit steps. The initial main CI reports four
pnpm misses; its two repeats report four hits each. The three main publications
report 4/46/46 cached BuildKit steps. These observations establish reuse, not
fully cold machines. There is no controlled cold full-PR/publication comparison,
so no cold speedup is claimed.

The earlier controlled dependency-stage experiment remains the invalidation
proof: a new builder imports the dependency layer, source-only changes reuse it,
and manifest/lockfile changes reinstall. PR image transfer was measured separately
in [Docker CI evidence](docker-ci-results.json); the runtime job loads the exact
archive built by its preceding job. A pnpm cache mount is not assumed to persist
between builders.

## Task-cache decision

Do not add Turbo or another task-output cache in this migration. On the three
upgraded PR CI attempts, median steps are 87 seconds for coverage tests, 7 seconds
for the app build, 6 seconds for typechecking, 3 seconds for lint and 3 seconds
for Storybook. Docker validation falls to a 76-second workflow median after
removing its duplicate build; it no longer dominates the PR median.

Caching typecheck/lint/build results would save short steps that are already off
the normal test critical path. Tests are the remaining repeated work, but the
suite spans shared TS-source packages and existing architecture tests read root
configuration and documentation. Safe cache keys would need those broad inputs,
lockfile, runtime/tool versions and relevant environment settings. The repeated
identical documentation revision used here could produce cache hits; it does not
establish a useful hit rate for normal source/configuration changes. A measured
cross-PR hit rate is needed before accepting that maintenance cost. Test cleanup
remains #46; no emitted package layer, extra task cache, skipped test gate or
remote-cache service was added.

A browser-binary cache would not address the observed Ubuntu font download.
[Playwright's CI guidance](https://playwright.dev/docs/ci#caching-browsers) also notes
that OS dependencies still need installation and browser-cache restoration can
cost about as much as downloading. Keep the existing install and browser gate;
revisit runner/image provisioning only if OS-package stalls recur.

## Reproduction and test accounting

Run `collect-attempts.py --run RUN_ID:ATTEMPT --output PATH`, repeating `--run`
for the selections retained in performance-attempts.json. It rejects incomplete
attempts and missing job records, rather than recording them as passing. For each
pair, subtract the earliest run_started_at from the latest last_job_completed_at;
then take the median of the paired elapsed values. Percentage reduction is
`100 * (1 - after_median / before_median)`.

The clean measurement worktree reports 1,269 passing tests and 19 skipped checks
that require the private, untracked CLAUDE.md file. The existing main checkout
runs those local documentation checks too and reports 1,288 passing tests.
Skipped checks are not counted as passes. Application behavior tests, coverage
settings and all CI gates remain active.
