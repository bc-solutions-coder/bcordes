# App migration and source-guard review proposal

Proposal for [Review app migration and source guards](https://github.com/bc-solutions-coder/bcordes/issues/70). **Awaiting human acceptance; implementation remains pending.**

## Complete inventory and observed evidence

[dispositions.tsv](dispositions.tsv) accounts for all 279 baseline declarations: 200 tests and 79 suites across 21 files. Every row records baseline and current title/location, assertion dispositions, replacement references, rationale, risk and planned verification. [baseline-drift.tsv](baseline-drift.tsv) explicitly maps intervening changes. [files.tsv](files.tsv), [runtime-cases.tsv](runtime-cases.tsv) and [summary.json](summary.json) record file totals, expanded execution evidence and the inspected revision/hashes.

Current scope is 20 files, 193 test declarations and 78 suites. The entire H3-resolution file (six tests and one suite) and one Dockerfile-copy assertion were removed by the toolchain work. All current declarations reconcile to the baseline; none is silently added or omitted. Renamed Oxlint boundary titles and the rewritten alias-resolution case are mapped, along with shifted locations and static namespace imports.

The targeted run passed **327 current runtime cases**, none failed or skipped. Parameterized file/export/glob cases are all included; they are not collapsed into static declaration counts. Baseline source is `990edf5a5ee6142dc8331d340c313e76f28e9a2d`. Owned-file hashes stayed stable during this review. Current success proves these guards run, not that they provide useful protection. No fresh coverage measurement is claimed.

| Proposed baseline case disposition | Cases |
| ---------------------------------- | ----: |
| Delete                             |   194 |
| Rewrite/relocate                   |     6 |

Seven of the delete rows are already absent, leaving 187 current deletion candidates and six current rewrites. **All 20 remaining files are proposed for removal after their named prerequisites; the H3 file is already removed.** This does not mean discarding useful executed checks: the six rewrite rows relocate those outcomes into focused tests/tools.

## Recommended decisions

### Delete source-only constraints without inventing replacement features

Feature/shell/shared module files assert file locations, old-path absence, import/re-export spellings or exported function types. They do not call the feature behavior. Remove those constraints, together with dead-code absence, Markdown-content removal, documentation-layout, manifest, dependency placement, config-object and exact-export inventories. Source-only organization rules do not need a fabricated user behavior test to justify deletion.

The accepted shell, public/contact/projects, inquiry/settings, notification, package and UI reviews already specify meaningful consumer protection. The ledger links exact cases and distinguishes existing evidence from planned replacements. Their accepted prerequisites still apply globally; a referenced future replacement is not claimed to have passed. Public API usability belongs in actual consumer execution, not an export type/count guard.

The [home export timeout follow-up](https://github.com/bc-solutions-coder/bcordes/issues/54#issuecomment-5572575902) is closed. Moving namespace loading out of the assertion timer fixed the timeout mechanism, but the remaining assertions still only check function types. Keep that historical fix as evidence; do not keep an otherwise obsolete export-shape test because its execution became reliable.

Architecture lint policy remains covered through the accepted real diagnostic-fixture plan. Deleting assertions about Oxlint configuration shape does not remove lint rules. The same distinction applies to documentation checks, production/Docker builds and release workflow configuration: preserve supported outcomes and gates, not exact source strings or file ownership.

### Preserve six executed checks in focused locations

| Current behavior to preserve                            | Replacement and owner                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A package UI story is discoverable and usable           | This review owns new `scripts/verify-storybook.mjs`: serve the actual static Storybook build, locate a known package story through its emitted index, load its iframe and assert a visible usable Button. The index is build output, not implementation source. Tooling review retains build compilation; UI review retains detailed component behavior.                                   |
| Package-only styling reaches actual components          | [Accepted UI review](https://github.com/bc-solutions-coder/bcordes/issues/67#issuecomment-5574059693) owns `ui-component-behavior.spec.ts`. Explicit deletion prerequisite: removing package-only styling from a controlled build must fail the relevant measured appearance/state scenario, then pass restored. Do not preserve sentinel text searches or emitted-selector spellings.     |
| Two release-tag transformations produce exact outputs   | This review owns `scripts/release-tag-outputs.sh` and `scripts/release-tag-outputs.test.mjs`. Extract the existing transformation unchanged, invoke that shared script from the workflow, and test its tag input and temporary GITHUB_OUTPUT results. Preserve both existing version/major/minor cases. No copied algorithm, publication, network operation or new malformed-tag contract. |
| The app test environment resolves a real alias consumer | [Accepted package review](https://github.com/bc-solutions-coder/bcordes/issues/66#issuecomment-5574002451) owns the actual runner/alias-consuming fixture in `packages/config/runner-behavior.test.ts`. The current Vite resolution execution is stronger than its old plugin-name check, but an exact resolved filename remains an implementation constraint.                             |
| Root coverage includes executed app and package code    | This review owns `packages/config/coverage-behavior.test.ts`: isolated actual-root-runner fixtures with known exercised/unexercised branches, observing emitted counters and LCOV results. Avoid recursive probe execution. Keep production exclusions and thresholds unchanged; this complements the accepted enforcement decision rather than replacing it.                              |

The table has five behavior categories because release parsing has two independent cases. These replacements must be verified before removing their original mixed files. No new source-text assertion is proposed. Future files and workflow changes remain plans, not implemented artifacts.

### Consolidate tooling evidence with its accepted owners

Root collection, workspace filtering, build execution, runtime smoke and documentation links already have accepted owners. Reuse their actual execution evidence instead of keeping a second suite that parses command strings or fixed file counts. Storybook compilation alone does not prove a package story loads, which is why the focused output probe above remains necessary.

The [standalone tooling review](https://github.com/bc-solutions-coder/bcordes/issues/69#issuecomment-5574339962) preserves actual gates and treats historical audit scripts as archival tools. This review does not revive those scripts as standing source-regression gates. No compiler, lint, build, browser, Docker or coverage requirement is weakened.

## Reconciliation details

The drift ledger includes all baseline/current locations and title changes. Assertion-level changes are explained in the disposition rows: dynamic-to-static imports, ESLint-to-Oxlint configuration, CSS build invocation, removed H3/Docker checks, and the plugin-name-to-executed-alias change. The original baseline artifacts were not overwritten.

The inventory extractor expects the older TypeScript compiler API, which root TypeScript 7 no longer provides. This review used a read-only adaptation with the already-installed TypeScript 5.9.3 parser, writing only temporary reconciliation data. Final reconciliation must use an available parser deliberately rather than rerun the old extractor in place and overwrite historical evidence.

## Implementation prerequisites

Apply the [accepted coverage safeguards](https://github.com/bc-solutions-coder/bcordes/issues/49#issuecomment-5571864230): reach and enforce 90% lines, statements, branches and functions before cleanup lands; inspect affected-area losses and preserve the denominator. Source guards can import modules incidentally, so their removal still needs measured coverage comparison. Incidental module loading is not a reason to retain weak assertions.

For every new or substantial replacement, introduce its relevant defect—missing story, omitted package styling, incorrect version output, unresolved alias, omitted app/package coverage—require failure, then restore and pass. Run affected tests during editing, full coverage before merge and the relevant real build/browser/tooling checks. Reconcile newly planned files with accepted owners and rerun against intervening changes. No test cleanup or workflow extraction was executed in this review.
