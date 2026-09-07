# Behavior-only test cleanup handoff proposal

Decision: [Agree on the implementation handoff and completion evidence](https://github.com/bc-solutions-coder/bcordes/issues/51). Status: proposed; implementation pending. Reconciled source: `a5f10c3211a1fb25671410b49752307cfe2a5b54`.

## Reconciled scope

All 124 baseline test files and 1,445 declarations have exactly one review owner: 1,127 test declarations and 318 suite declarations. Accepted test dispositions total **228 keep, 70 rename, 318 rewrite and 511 delete**. These are baseline decisions, not counts of work already implemented. The separate 48 standalone tooling/resource rows are not additional test cases.

Current source contains 124 test files, 1,118 test declarations and 316 suites. Eleven baseline tests and two suites were removed by intervening work; two new tests were added. The H3 test file is gone and an Oxlint plugin test file is new. Parameterized runtime cases and assertion counts are separate quantities; do not subtract static declarations from the historical 1,298 Vitest and 24 browser runtime counts to predict the final suite.

[file-ownership.tsv](file-ownership.tsv) preserves baseline owners and current file hashes, including the new file. [current-title-map.tsv](current-title-map.tsv) maps baseline and current declarations, including removed and renamed titles. [drift-review.md](drift-review.md) resolves changed-file applicability and proposes dispositions for the two new tests. Baseline audit ledgers remain immutable; current inventory was extracted to a temporary directory with the baseline extractor and an available TypeScript parser, without overwriting baseline assets.

## Authoritative decisions

Implement each accepted ledger's retained/removed assertions, replacement location, rationale and defect verification. A file-level delete is conditional on its useful replacements; it is not permission to discard useful behavior in mixed cases.

| Review                             | Baseline files / tests | Detailed plan                                                       |
| ---------------------------------- | ---------------------: | ------------------------------------------------------------------- |
| Shell, routing, auth and motion    |                15 / 86 | [Accepted review](../reviews/shell-routing-auth-motion/README.md)   |
| Public pages, contact and projects |               22 / 222 | [Accepted review](../reviews/public-contact-projects/README.md)     |
| Inquiries, settings and schema     |                8 / 104 | [Accepted review](../reviews/inquiries-settings-schema/README.md)   |
| Notifications                      |               13 / 117 | [Accepted review](../reviews/notifications/README.md)               |
| Package infrastructure             |               19 / 215 | [Accepted review](../reviews/package-infrastructure/README.md)      |
| UI, forms and navigation           |               22 / 159 | [Accepted review](../reviews/ui-forms-navigation/README.md)         |
| Browser behavior                   |                 4 / 24 | [Accepted review](../reviews/browser-behavior/README.md)            |
| App migration and source guards    |               21 / 200 | [Accepted review](../reviews/app-migration-source-guards/README.md) |
| Standalone tooling                 | 48 check/resource rows | [Accepted review](../reviews/standalone-tooling/README.md)          |

Apply the three accepted gap decisions when they overlap existing cases:

- [Shell recovery and auth validation](../gaps/shell-error-auth-validation/README.md): actual render recovery and registered/transport validation. Local and CI checks use controlled sessions, synthetic credentials and a fixture backend. No live identity provider or production credentials; no new returnTo policy.
- [Notification pagination](../gaps/notification-pagination/README.md): an explicitly limited loaded-list view, with inactive pagination removed. Preserve account-wide mark-all and returned order. Full pagination is deferred.
- [Bell read failure](../gaps/notification-bell-read-failure/README.md): immediate navigation supersedes the bell's former wait-before-navigation timing; failure feedback, authoritative unread state and successful retry must be observable after navigation.

## Implementation order

Track execution in new GitHub implementation issues linked to these decisions. Closing a planning ticket does not close implementation work. Assign one implementation owner per existing file; gap scenarios in that file coordinate through that owner rather than concurrent edits. Preserve unrelated work using isolated checkouts where needed.

1. **Refresh and establish the starting evidence.** Record commit, tool versions, tracked/untracked changes, all test entrypoints and runtime cases, and a fresh full coverage report. Reconcile any drift since this handoff at declaration and assertion level. Treat the historical 87.22% function coverage as a known baseline shortfall, not a current measurement. Inventory new test-only harness files and standalone runners as they are created.
2. **Build the required evidence infrastructure and reach 90%.** Implement real runner/compiler/lint fixtures, isolated browser request/session controls, and the behavior additions needed to close measured coverage gaps. Existing Oxlint CLI cases should be reused and strengthened, not duplicated. Add and enforce at least 90% for lines, statements, branches and functions before any cleanup lands. Keep the existing coverage denominator; do not add exclusions, ignores, skips or reduce thresholds to pass. Browser/tooling success supplies no automatic Vitest coverage credit.
3. **Replace and clean one owned area at a time.** Start with package/test-provider and browser fixture foundations, then shell/auth, public/contact/projects, inquiry/settings/validation, notifications with both gap decisions, and UI/navigation. Implement useful replacements and prove their relevant deliberate defects are detected before removing their old assertions in the same reviewable batch or a later batch. Rename only where assertions already establish the named outcome. Source-only constraints require no invented replacement feature, but all global and named consumer prerequisites still apply.
4. **Finish shared tooling and source-guard removals.** Complete runtime smoke, bounded Docker readiness, emitted Storybook interaction, shared release-tag execution and real coverage/alias probes. Remove source-guard files after all referenced replacements pass, especially the UI scenario that must fail when package-only styling is omitted. Repeat the unused Wallow test-helper consumer search before retiring its implementation/export/tests; retain actual SDK behavior.
5. **Reconcile and verify the final suite.** Update every implementation row with resulting test/title or explicit deletion, evidence and commit. Account for all new, moved and expanded cases and entrypoints. Run full coverage, browser/build/tooling and CI checks against the final artifact. Resolve failures and inspect affected-area coverage losses before declaring completion.

Order inside a stage may change for a dependency or isolated file ownership; replacement-before-removal and the 90% landing prerequisite cannot. A coverage shortfall blocks landing cleanup. Add meaningful tests for uncovered supported behavior; if the target cannot be met without changing scope, reopen the coverage decision instead of silently weakening it.

## Future files and scenario ownership

These 15 named files are planned, not implemented: 13 test files and two runtime scripts. Additional test-only fixture/harness paths must be registered when chosen.

| Planned path                                                        | Owner                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/web/e2e/tests/shell-motion.spec.ts`                           | Shell review                                                      |
| `apps/web/e2e/tests/project-filter-appearance.spec.ts`              | Public/contact/projects review                                    |
| `apps/web/src/features/notifications/server-fns/validation.test.ts` | Inquiry/settings/schema review                                    |
| `apps/web/e2e/tests/notification-appearance.spec.ts`                | Notification review                                               |
| `packages/auth/src/testing/index.test.ts`                           | Package review                                                    |
| `packages/config/runner-behavior.test.ts`                           | Package review, including alias execution                         |
| `apps/web/e2e/tests/ui-component-behavior.spec.ts`                  | UI review, including test-only harness and package styling defect |
| `scripts/verify-production.test.mjs`                                | Standalone tooling review                                         |
| `scripts/verify-storybook.mjs`                                      | Source-guard review                                               |
| `scripts/release-tag-outputs.sh`                                    | Source-guard review                                               |
| `scripts/release-tag-outputs.test.mjs`                              | Source-guard review                                               |
| `packages/config/coverage-behavior.test.ts`                         | Source-guard review                                               |
| `apps/web/src/routes/__root.error.test.tsx`                         | Shell recovery/auth gap                                           |
| `apps/web/e2e/tests/shell-error-recovery.spec.ts`                   | Shell recovery/auth gap                                           |
| `apps/web/e2e/tests/auth-input-validation.spec.ts`                  | Shell recovery/auth gap                                           |

The shell gap also owns additional validator scenarios in existing auth server-function tests. Pagination owns additional page/filter/server scenarios. Bell failure owns additional component/dashboard-browser scenarios. Original cases retain their review owners. Browser fixtures belong to the browser review and serve all these scenarios. New Node tests and the Storybook runtime probe must be wired into explicit local/CI execution; merely creating files is insufficient.

## Required completion evidence

For each substantial replacement, record the supported outcome, deliberate defect, failing command/result, restored passing result and exact revision. Use disposable copies for destructive probes. Do not suppress unhandled errors or substitute copied implementations, raw source assertions, export shape checks or callback-only mocks for the behavior being claimed.

Each implementation issue should link a completion ledger with: original file/title key, resulting file/title or deletion, assertion changes, replacement owner, verification commands/results, coverage before/after for affected areas, and final commit. Record justified adaptations to changed production contracts instead of treating obsolete line numbers as instructions.

Final acceptance requires:

- Every original and newly discovered test/suite title reconciled, with no duplicate ownership or unresolved disposition. Parameterized case expansion and newly added runner entrypoints are accounted separately.
- Zero intended raw-source/implementation-structure assertions and no unresolved migration-only guards in the standing test suite. Review search candidates manually: tool input fixtures, rendered output, cache namespace strings and privacy-field contracts can be valid behavior. Audit extractors and historical source-comparison tools remain archival, outside standing behavioral acceptance gates.
- All four global coverage metrics at least 90%, enforced by actual runner failure below the threshold, with unchanged measurement scope and reviewed affected-area losses.
- Passing relevant focused tests during editing, then fresh full coverage and final build/browser/tooling checks. Current commands include `pnpm test --coverage`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `bash scripts/verify-production.sh`, `pnpm --filter bcordes exec playwright test`, and `pnpm --filter bcordes build-storybook`. Add explicit Node test and Storybook runtime commands when their planned scripts exist. Run Docker verification using the same built image and its documented prerequisites; record the actual verified platform/configurations.
- Normal CI quality gates pass on the final implementation revision, with linked run/artifact evidence. Pre-commit or a successful push that bypasses a required status is not CI evidence. Do not deploy or publish to prove test cleanup.

Refresh exact command flags and environment requirements from the current entrypoints before execution. This handoff is planning evidence: targeted existing-test runs do not establish replacement success or current 90% coverage.
