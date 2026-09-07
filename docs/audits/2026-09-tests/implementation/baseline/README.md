# Implementation starting evidence

For [Refresh inventory and coverage baseline](https://github.com/bc-solutions-coder/bcordes/issues/89), under the [implementation tracker](https://github.com/bc-solutions-coder/bcordes/issues/88).

Source revision: `e872519d71918ec2f9fb1ecf24d865eeea401b09`; clean starting tree, Node 24.11.1 and pnpm 11.26.0. No test/application/package/tooling/configuration changes since the accepted handoff snapshot. Its [complete title mapping](../../handoff/current-title-map.tsv), [file ownership](../../handoff/file-ownership.tsv) and [drift supplement](../../handoff/drift-review.md) therefore remain applicable: 124 files, 1,118 test declarations and 316 suites. No new case ownership is needed at this baseline. Historical ledgers were not overwritten.

Fresh results: 1,288 Vitest cases and 24 browser cases pass, with no failures or skips. Production build passes. [runtime-cases.tsv](runtime-cases.tsv) records all expanded titles; [summary.json](summary.json) records commands and versions. Existing entrypoints remain those in the accepted [handoff](../../handoff/README.md) and [standalone review](../../reviews/standalone-tooling/README.md); planned Node/Storybook runtime entrypoints do not yet exist. No cleanup or replacement verification was performed.

## Coverage and next work

[coverage-summary.json](coverage-summary.json) records current per-file data with repository-relative paths. Current results are 84.32% lines (909/1078), 83.24% statements (964/1158), 84.19% functions (325/386), and 75.74% branches (506/668). These are the current runner's measurements, not directly comparable percentage improvements or regressions against the old toolchain. All four are below 90%; enforcement is still absent. Existing included/excluded scope must be preserved.

[Reach and enforce meaningful 90% coverage](https://github.com/bc-solutions-coder/bcordes/issues/90) owns additive gap closure and must record resulting tests for later owners to reuse. Prioritize these supported seams, using real owned logic and controlled external boundaries:

| Area                                 | Supported behavior to add or strengthen                                                                                                        | Later implementation owner         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| SDK session/request/service adapters | Persistent session lookup, per-request cookies/CSRF/forwarded headers, returned cookies, real SDK HTTP outcomes and service-client cache reuse | Authentication/server/SDK packages |
| Valkey SDK adapter                   | Stored/retrieved/deleted values, set membership, expiry and conditional creation, plus failed connection behavior                              | Query/cache/logging/utilities      |
| Root/auth error UI and shell actions | Actual error messages and recovery destinations, supported menu/contact actions and root fallback reset                                        | Shell/auth and public/contact      |
| Inquiry and notification UI          | Mutation success/failure, selections, reset/filter states and invalidation visible through rendered results                                    | Inquiry/settings and notifications |
| Event stream and push capability     | Remaining leader/follower, visibility, reconnection/message and unavailable/error outcomes                                                     | Notifications                      |
| Auth and security boundaries         | Profile fallbacks, invalid/mismatched sessions, forbidden access and production response-header behavior                                       | Authentication/server/SDK packages |
| Fixture/provider consumers           | Admin-session factory outcomes, supplied cache/cleanup behavior and actual devtools cache visibility                                           | Package owners                     |
| Supported infrastructure entrypoints | Request middleware response behavior and development metric output through executable consumers                                                | Shell/package owners as applicable |

This is a prioritized gap list, not a commitment to make every file independently reach 90%. Use the per-file report to select additional supported cases as needed. Current aggregate deficits require at least 62 additional covered lines, 79 statements, 23 functions and 96 branches if totals stay fixed; totals may change with executed paths, so remeasure after additions. Pure re-export barrels are not an excuse to revive export/source assertions. Do not add artificial feature contracts or waive the denominator to raise percentages.

No pre-existing test failure was observed in these runs. CI and separate production smoke/Docker checks were not run for this baseline and are not claimed; full implementation completion still requires all final gates. Existing passing tests are not evidence that their planned replacements already exist.
