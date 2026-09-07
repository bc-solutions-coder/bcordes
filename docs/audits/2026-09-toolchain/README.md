# Toolchain migration baseline

Evidence for [#55](https://github.com/bc-solutions-coder/bcordes/issues/55), captured on September 7, 2026. This records the starting condition for the approved migration in [#52](https://github.com/bc-solutions-coder/bcordes/issues/52). No dependencies, application behavior, lint configuration or tests were changed.

## Revision and environment

The run started on clean `main` at `6d5accb2ad4f5ed5bec91c3b2883f13d31cf22d0`. An unrelated session committed four test-review documents as `dfbe151b4fc7f5772aa63755e5d43e44bab81e9f` during execution. Application source, tests, manifests and lockfile did not change between those revisions. Those unrelated documents were preserved.

Local environment: macOS arm64, 14 logical CPUs, 24 GiB RAM, Node 24.11.1, pnpm 10.28.2, Docker 28.5.1 with a Linux arm64 engine. Registry authentication was available. `NODE_OPTIONS` was initially unset; the default V8 heap limit was 4,288 MiB.

These are single local observations using an existing installation, browser and Docker cache. They are not clean-machine or cold-cache measurements. Quality commands ran sequentially; read-only network metadata collection ran concurrently. No deployment was triggered. [Provenance](provenance.json) and [installed dependencies](installed.json) retain the exact environment and all 15 workspace dependency inventories.

## Quality results

Commands run from the repository root. [Command evidence](commands.json) records UTC start times, elapsed seconds, environment overrides, exit codes and result descriptions.

| Check                                                                     | Seconds | Result                                          |
| ------------------------------------------------------------------------- | ------: | ----------------------------------------------- |
| `pnpm install --frozen-lockfile`                                          |    1.09 | Pass; already up to date, warm installation     |
| `pnpm lint`                                                               |   23.29 | Failed: default heap exhausted, process aborted |
| `pnpm typecheck`                                                          |    8.50 | Pass across workspace scripts                   |
| `pnpm build`                                                              |    9.68 | Pass                                            |
| `bash scripts/verify-production.sh`                                       |    0.24 | Pass: public pages and CSS/JS assets            |
| `pnpm --filter bcordes exec playwright install chromium`                  |    0.88 | Pass; browser already available                 |
| `E2E_PORT=4517 pnpm --filter bcordes exec playwright test`                |   12.94 | 23 passed, 1 failed                             |
| `pnpm --filter bcordes build-storybook`                                   |    5.42 | Pass                                            |
| `bash scripts/verify-docker.sh`                                           |   24.68 | Pass; native arm64, four cached steps           |
| `pnpm exec vitest run --coverage`                                         |   36.02 | 120 files and 1,298 tests passed                |
| `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`, after Storybook build |   23.46 | Failed: five generated-output parser errors     |
| Same larger-heap lint command, after removing this run's Storybook output |   21.99 | Pass                                            |

The full Vitest coverage suite ran once. The lint retries investigate two observed baseline failures; they do not replace the original failure record. No future `format:check` command was treated as an existing gate.

The Docker check exercised the same native image with disposable Valkey under two runtime redirect configurations. The browser suite used its controlled backend. These checks do not establish live Wallow/OIDC compatibility or newly verify amd64. Historical CI includes both architecture builds.

### Failures and follow-up ownership

- [#53](https://github.com/bc-solutions-coder/bcordes/issues/53) reproduced: the homepage browser check expects visible `6+`, while current content renders `7+`. Preserve the intended content check when resolving it.
- [#54](https://github.com/bc-solutions-coder/bcordes/issues/54) did not reproduce in this one full-suite run. It remains unresolved; one pass is not evidence that the intermittent failure is fixed.
- [#79](https://github.com/bc-solutions-coder/bcordes/issues/79) records the default-heap lint failure. The larger-heap invocation is already documented and passes without generated Storybook output.
- [#80](https://github.com/bc-solutions-coder/bcordes/issues/80) records build/lint ordering: generated Storybook JavaScript is not ignored by lint and appears untracked. Removing only output created by this baseline restored the documented lint invocation. No ignores or rules were changed.
- Installation reports a query/test-utils workspace cycle and warns that `pnpm.overrides` is ignored. The install still passes. Reconcile the warning with resolved Router dependencies in [#58](https://github.com/bc-solutions-coder/bcordes/issues/58); this observation does not establish the override's effect in every environment.

[The green-baseline gate #71](https://github.com/bc-solutions-coder/bcordes/issues/71) owns readiness for upgrades. Capturing these failures completes the measurement task, not that gate.

### Coverage

| Metric     | Covered / total | Percent |
| ---------- | --------------: | ------: |
| Lines      |   4,817 / 5,212 |  92.42% |
| Statements |   4,817 / 5,212 |  92.42% |
| Branches   |       637 / 707 |  90.09% |
| Functions  |       198 / 227 |  87.22% |

[Coverage totals](coverage-total.json) come from the fresh run. Function coverage remains below the meaningful 90% target tracked in [#46](https://github.com/bc-solutions-coder/bcordes/issues/46). The current configuration has no enforced percentage threshold; passing Vitest does not mean that target is met. Existing exclusions include stories, tests, generated routes, type-only files and UI primitives. No exclusions or thresholds changed.

## Published compatibility snapshot

[Registry evidence](registry.json) captures the exact npm queries, versions, dependencies, engine ranges and optional-peer metadata for 35 targets. Tags can move; recheck during implementation. This is metadata compatibility, not proof the upgraded repo passes.

| Component                               | Installed baseline | Published target observed  | Constraint or migration note                                                        |
| --------------------------------------- | ------------------ | -------------------------- | ----------------------------------------------------------------------------------- |
| TypeScript                              | 5.9.3              | 7.0.2                      | Native compiler; check remaining compiler-API consumers                             |
| Vite / React plugin                     | 7.3.1 / 5.1.2      | 8.2.2 / 6.1.1              | Node 24 satisfies engine ranges; verify plugins and SSR                             |
| Vitest / coverage                       | 3.2.4              | 5.0.0                      | Keep provider matched; supports Vite 8 and Node 24                                  |
| Storybook / React Vite framework        | 9.1.17             | `next`: 11.0.0-alpha.0     | Accepted prerelease exception; pin matching packages                                |
| React / React DOM                       | 19.2.4             | 19.2.8                     | DOM requires matching compatible React                                              |
| Tailwind / Vite plugin                  | 4.1.18             | 4.3.3                      | Existing CSS-first integration; plugin accepts Vite 8                               |
| Oxlint / tsgolint / Oxfmt               | Not installed      | 1.81.0 / 7.0.2001 / 0.66.0 | Verify native rule coverage and formatting behavior                                 |
| Nitro                                   | 3.0.1-alpha.0      | 3.0.260903-beta            | Accepted prerelease exception; still depends on h3                                  |
| Direct h3                               | 2.0.1-rc.16        | 2.0.1-rc.31                | Latest is still a prerelease; direct removal differs from transitive removal        |
| Node types                              | 22.19.7            | 24.13.3 in major 24        | Align with runtime, not the unrestricted latest major                               |
| TanStack Start                          | 1.167.5            | 1.168.50                   | Node >=22.12; Vite >=7 is an optional peer satisfied by the Vite integration        |
| TanStack Router / router plugin         | 1.168.3 / 1.167.4  | 1.170.33 / 1.168.36        | Plugin's Router peer requires ^1.170.33                                             |
| TanStack Query                          | 5.101.2 resolved   | 5.102.8                    | Updated SSR-query integration requires Query/core >=5.102.0                         |
| TanStack Table / match-sorter utilities | 8.21.3 / 8.19.4    | 9.2.4 / 9.1.2              | These are major upgrades; do not treat them as routine patch bumps                  |
| TanStack Store / React Store            | 0.9.2              | 0.11.1                     | Update the paired integration; remaining devtools versions are in registry evidence |

The current typed ESLint rules require a compiler API. Replacing ESLint with Oxlint removes that specific consumer, but Storybook next still declares a TypeScript docgen plugin. Verify the active story/docgen configuration before claiming TS6 can disappear. Storybook's own next branch uses TS7 checks while keeping TS6 for API consumers. Optional peers are recorded as optional; they are not blanket requirements to install additional frameworks.

Primary references: [TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [Vite 8 migration](https://vite.dev/guide/migration), [Oxlint typed lint](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable), [Storybook's compiler arrangement](https://github.com/storybookjs/storybook/blob/next/AGENTS.md).

## CI and publication timings

[CI evidence](ci-runs.json) contains five successful runs each for CI, Docker PR validation and image publication, including exact revisions, events, job/step durations, run links and cache-marker counts. It also records same-revision matches where available.

| Workflow             | Samples | Median creation-to-final elapsed | Median latest-attempt elapsed | Median job execution span | Median latest-attempt start delay |
| -------------------- | ------: | -------------------------------: | ----------------------------: | ------------------------: | --------------------------------: |
| CI on main           |       5 |                            232 s |                         232 s |                     228 s |                               3 s |
| Docker PR validation |       5 |                            536 s |                         469 s |                     462 s |                               5 s |
| Image publication    |       5 |                            331 s |                         331 s |                     327 s |                               3 s |

Creation-to-final elapsed includes earlier attempts and rerun waiting. Three Docker samples are second attempts; their earlier attempts are not successful samples. Latest-attempt elapsed starts at the API's `run_started_at`; job and step measurements describe only that latest attempt. Start delay is relative to that attempt and includes scheduling/dependencies, not just runner queue time. Execution span runs from the earliest job start to the last completion and can include gaps. These medians are calculated independently and are not additive. API timestamps have second precision and may include finalization.

The five CI samples are September 7 main pushes. Median steps were 214 s for coverage tests, 24 s for Vite build, 24 s for typecheck and 21 s for lint. Dependency installs took a median 2–3 s per job, and Chromium installation 22 s. Tests dominate this CI sample; bundling is not its main bottleneck.

Docker validation's median build step was 435 s. Its sample mixes three September runs with two July runs; only the three recent runs have the separate runtime job, whose median verification step was 60 s. They are not five equivalent current-workflow trials. The publication build-and-push median was 306 s.

Four of the five Docker runs matched successful PR CI at the same SHA; their observed CI-plus-Docker spans were 628, 312, 614 and 536 s. Only the first two are recent. One sampled Docker run has no successful same-SHA PR CI match. These creation-to-final spans include rerun delays where present, exclude unqueried required checks and do not certify branch protection or end-to-end PR readiness. There is insufficient evidence for a five-run comparable current PR baseline.

Matching each publication to the latest preceding successful CI at the same SHA gives 641, 468, 692, 569 and 579 s from CI creation through publication completion, median 579 s. The match uses SHA and timing, not a verified trigger-run ID. These measure image publication, not external rollout.

### Cache observations and limits

- Four CI runs show four pnpm restore hits each; one shows four explicit pnpm cache misses. Their elapsed medians are 235 s and 174 s respectively. Different source revisions and test durations prevent attributing that difference to caching.
- Two Docker validation runs show cached BuildKit steps; three show none. All show cache import/export activity. No `CACHED` marker is not proof of a fully cold cache, because mounts and other cache layers may still be reused.
- All five publications show cached BuildKit steps. There is no controlled cold-publication sample.
- The local install was already up to date and the local Docker run reused four steps. Neither is a cold measurement. Caches were not cleared and remote workflows were not triggered solely to collect timings.

For #61, collect matched current-workflow PR trials and controlled cold/warm runs before claiming the 25% improvement. Keep runner conditions, command scope and sample definitions consistent. Measure tests and repeated Docker work separately; these observations do not yet justify Turbo or quantify savings from any proposed change.

## Reproduce the evidence

Use the setup, testing and deployment guides for authentication, Valkey and Docker prerequisites. Execute the commands in [commands.json](commands.json) sequentially against the recorded revision. The default browser setup starts disposable Valkey. Raw logs were kept outside the repo during execution; committed evidence contains results and selected failure descriptions, not credentials.

To take a new historical CI snapshot without altering CI:

```sh
python3 docs/audits/2026-09-toolchain/collect-ci.py --output /tmp/bcordes-ci-runs.json
```

The collector queries the five most recent successful runs per workflow, so a later invocation is a new sample rather than a replay of this snapshot. It records cache-marker counts without persisting raw logs. `installed.json` derives from `pnpm list -r --depth 0 --json`, retaining dependency names and resolved versions without machine-specific paths. Registry query instructions are embedded in `registry.json`.
