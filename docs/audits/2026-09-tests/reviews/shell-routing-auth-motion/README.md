# Shell, routing, auth, and motion review proposal

Draft for [Review shell, routing, auth, and motion tests](https://github.com/bc-solutions-coder/bcordes/issues/62). **Awaiting human review. No dispositions are accepted and no tests have been changed.**

## Coverage of the review

[dispositions.tsv](dispositions.tsv) accounts for all 108 baseline declarations: 86 test cases and 22 suites in 15 files. Each case records its current title, full nested title, proposed disposition/title, observed assertions to retain/remove, replacement behavior, risk, rationale, and implementation verification. [files.tsv](files.tsv) aggregates these into file-level proposals. [summary.json](summary.json) records the snapshot and observed validation.

Reconciliation matched every file/line/kind/title against the original inventory with no omissions or duplicate rows. These 15 test files have not changed since baseline source commit `990edf5a5ee6142dc8331d340c313e76f28e9a2d`. The reviewed checkout is `ba946c898db45c86785d76af883fdac7d5612426`. Its 86 expanded runtime cases match the 86 static test declarations; this group has no parameterized expansion difference.

A targeted run of all 15 owned files passed all 86 tests with none skipped. That proves the existing tests pass. It does not prove the proposed replacements, future deliberate-defect checks, browser scenarios, or future coverage results. Those are explicitly planned evidence.

| Proposed test disposition | Cases |
| ------------------------- | ----: |
| Keep                      |    18 |
| Rename                    |     6 |
| Rewrite                   |    42 |
| Delete                    |    20 |

These are test-case counts, not file deletion counts. The only proposed entire-file removal is `app/config/navigation.test.ts`, conditional on consumer tests covering actual named destinations. Other file proposals retain behavior while removing or replacing weak assertions. A rewrite can be small, such as removing an incidental call-count assertion while keeping a strong hydration check.

## Recommendations requiring acceptance

### Consolidate structural checks into exercised behavior

Remove navigation-array shape checks after Header/Footer/MobileNav tests verify named link destinations. Remove router sentinels, export/configuration shape checks, provider call-count assertions, and duplicated wrapper checks in favor of real route loading, cache isolation, and the existing SSR hydrated-consumer behavior.

The existing “creates a fresh context” case only counts calls and can pass when routers share a cache. Replace it with two real router instances and evidence that data seeded in one cache is absent from the other. The preload setting case should exercise intent and destination loading rather than require the string `intent` in a captured config.

The health case titled “ping times out” only rejects an Error promise. It duplicates the rejected-ping case and proves no elapsed-time timeout. Remove that case while retaining successful, rejected, unexpected, empty, and null response behavior. Keep the invalid response variants because they test different input classes; they may share a parameterized body later.

### Preserve meaningful visual outcomes without freezing utility classes

Recommend retaining Header's scrolled/top visual distinction and FadeInView's reveal/reduced-motion behavior as rendered contracts. Replace exact utility-class checks with controlled browser computed-style or focused visual checks. Test both entering/leaving the reveal region where applicable, reduced-motion immediate visibility, and the requested delay. Avoid exact shadow geometry or utility names; check the intended change or absence of motion.

Proposed browser replacement location: `apps/web/e2e/tests/shell-motion.spec.ts`, owned by this review for these scenarios. This would be a future addition, not a transfer of any existing browser test from the browser review. That review and final reconciliation must account for the new file. Use actual application content where it exercises the scenario; a controlled component-browser fixture may be needed for non-default props. Do not add product-only routes merely to expose test states.

Browser coverage is separate from Vitest coverage. Preserve real-hook tests for observer/preference state, and compare affected Vitest function/branch coverage before deleting class cases. If removing them loses measured execution, document that loss and add meaningful measured behavior coverage as required by the accepted coverage safeguards. Do not invent another structural assertion to restore a percentage. Any conflict that cannot meet those safeguards must remain an explicit unresolved implementation prerequisite.

### Strengthen auth and lifecycle assertions

Keep real HTTP status/body checks, account display, permissions, and SDK logout boundary behavior. Add `Cache-Control: no-store` assertions to both authenticated and anonymous `/auth/me` cases. Replace internal `requireAuth` call-only checks with redirect/error propagation through the real owned middleware, controlling the external session boundary. Verify completion waits for authorization; do not treat forwarding alone as successful enforcement.

Exercise actual component behavior for Header account/mobile actions and contact-link visibility, and add logout error feedback and mobile-close scenarios where the current implementation provides them. Subscription fakes must track the actual callback and observed target, so “cleanup” cannot pass after removing the wrong listener, and an intersection callback cannot fire for an unobserved element. The “default” one-time animation case must omit the option and verify it remains visible after exit.

The root head test currently asserts only that metadata keys exist. Replace it with generated document metadata outcomes. Root shell tests should observe real shell content/actions instead of component markers. Keep development-tools availability as a developer-facing contract, but remove the invented package-subpath marker and verify actual owned plugin content plus production exclusion.

## Additional gaps and limits

The root implementation also has route-error recovery and a loading overlay. They are not covered by the current root tests. This proposal does not silently claim them as retained protection. The final coverage/handoff planning should consider route-error display and Try Again behavior as meaningful uncovered behavior. The separate boot-loading-screen effort owns its evolving product contract; coordinate rather than redefining it here.

The server-function test adapter bypasses input validation. The proposed middleware outcome cases alone will not establish actual transport validation. A malformed-input/real-transport case, if selected as a required contract, belongs explicitly in later implementation planning, not in claims about this targeted run.

Local duplicate/replacement references are all within this group except supporting middleware/package behavior, which is evidence about a dependency rather than a reason to delete adapter coverage. The proposed browser file is new and must be included in final inventory reconciliation. No current case is deleted based on a pending decision from another group.

## Acceptance and implementation boundary

Accepting this proposal chooses the listed dispositions and replacement requirements. It does not mean the replacements exist, that coverage is adequate, or that deletion can land immediately. The approved global 90% prerequisite, per-area review, deliberate-defect evidence for new/substantial rewrites, and appropriate full-suite/browser/build gates all still apply.

Implementation must resolve the listed prerequisite evidence before deleting its corresponding test, refresh the baseline for intervening changes, and record the final paths/titles in the execution ledger. The partition handoff remains blocked until this and the other review tickets are accepted and their combined inventory is reconciled.
