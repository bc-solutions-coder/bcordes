# Final behavior-test reconciliation — #104

Completes [#104](https://github.com/bc-solutions-coder/bcordes/issues/104) for [epic #88](https://github.com/bc-solutions-coder/bcordes/issues/88), against accepted baseline `e872519d71918ec2f9fb1ecf24d865eeea401b09`. Final implementation revision `6bca2177659a9af07ee423dd4d0da200891a2179` passes both local gates and [normal CI](https://github.com/bc-solutions-coder/bcordes/actions/runs/34181438193).

The cleaned suite has 743 passing unit cases, 50 passing browser cases and 29 passing standalone CLI cases, with no failures, skips or browser retries. The built Storybook runtime probe also passes. The baseline had 1,288 unit and 24 browser cases. Static declaration totals and runtime expansions differ because parameterized cases and loops expand during execution.

| Coverage   | Baseline |  Final |
| ---------- | -------: | -----: |
| Lines      |   84.32% | 97.39% |
| Statements |   83.24% | 96.18% |
| Branches   |   75.74% | 92.35% |
| Functions  |   84.19% | 96.08% |

All four 90% thresholds remain enforced. Exclusions are unchanged. [Coverage changes](coverage-delta.tsv) explain every changed per-file counter: behavior coverage increased; denominator changes come only from accepted notification behavior/pagination changes, the logout origin boundary and removal of an unused Wallow fixture. No coverage value changed during the final source-guard removal or reconciliation. [Final counters](coverage-summary.json) and [LCOV output](coverage.lcov) preserve actual local artifacts.

## Reconciliation

- [Original declarations](original-reconciliation.tsv): all 1,445 original declarations plus the two accepted Oxlint handoff additions, each with one owner and implementation evidence. Suite rows group their mapped child outcomes; historical deletions remain visible.
- [Current declarations](reconciliation.tsv): all 761 current declarations (653 test declarations and 108 suites) across 115 executable test files, including new entrypoints, titles and owners.
- [Runtime cases](runtime-cases.tsv): all 822 executed cases across those same files, including parameterized expansions. Node cases are separate from Vitest coverage.
- [New resources](new-resources.tsv): all 50 added non-document resources since the accepted baseline, including fixtures, helper modules, scripts and the browser golden image. Introduction commits determine resource ownership; later consumer work is recorded in slice evidence.
- [Source candidates](source-candidates.tsv): manual classifications of broad search hits. Compiler output, LCOV counters, CLI output files, controlled tool inputs, rendered DOM and type narrowing remain legitimate. No intended raw-source/implementation-structure assertion or unresolved migration guard remains.
- [Standalone tooling](../production-tooling/dispositions.tsv): all 48 original command, check and archival-exclusion rows; new runtime and tag commands are also registered in [Storybook resources](../storybook-release/resources.tsv).

[Inventory](inventory.mjs), [files](files.tsv), [titles](titles.tsv) and [assertions](assertions.tsv) are archival audit artifacts, not standing source tests. The inventory explicitly uses the installed TypeScript 5.9.3 parser because root TypeScript 7 does not supply the compiler API used by this historical extractor. It writes only this final directory and does not overwrite the accepted baseline or review ledgers.

## Final prerequisite correction

Final inspection found that the earlier coverage fixture exercised only package code, despite the accepted requirement to prove both app and package coverage. The existing test now executes a fixture in each area through the actual root runner, requires emitted LCOV branch counters for both, rejects partial coverage and passes complete execution. Removing either coverage include separately fails the probe; both mutations were restored. This corrects the earlier broad prerequisite claim without reinstating a source guard, duplicating a test or weakening thresholds.

## Verification scope

Fresh local production build, full coverage, Chromium browser suite, 29 CLI cases, production HTTP smoke, Storybook build/runtime, typecheck, lint, formatting and documentation links pass. The final Docker check reuses the pinned #101 linux/amd64 image under arm64 emulation and verifies public serving under both callback/logout URL configurations. The #101 evidence also proves real success/failure resource cleanup. These checks do not claim live identity-provider authentication, registry publication or deployment. Browser auth exercises synthetic sessions through the real built transport.

The final CI run passes all four jobs: test, build, lint and typecheck. Its logs confirm 743 unit cases, 50 browser cases, 29 CLI cases and the built Storybook probe. The downloaded [coverage artifact](https://github.com/bc-solutions-coder/bcordes/actions/runs/34181438193/artifacts/10039081864) measures 97.58% lines, 96.35% statements, 92.50% branches and 96.60% functions. The only difference from local results is additional Valkey callback execution, with identical denominators and no per-file loss. [CI results](ci-results.json) preserve job links, artifact digest and counter differences; [CI coverage](ci-coverage-summary.json) preserves the downloaded values.

Both independent reviews found no remaining issues. [Summary](summary.json) records commands, totals, the final defect evidence and CI status. Prior slice evidence retains each accepted title/deletion map and its deliberate-defect/restoration results.
