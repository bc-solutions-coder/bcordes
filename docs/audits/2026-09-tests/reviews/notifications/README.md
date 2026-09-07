# Notification test accepted review

Accepted plan for [Review notification tests](https://github.com/bc-solutions-coder/bcordes/issues/65). The user accepted the complete proposal with "looks good to me". **Implementation remains pending; test cleanup is not implemented.**

## Inventory and observed evidence

[dispositions.tsv](dispositions.tsv) records every original title, assertion disposition, replacement location, coverage risk, rationale and planned defect check. [files.tsv](files.tsv) summarizes all 13 owned files. All 151 declarations reconcile with the inventory: 117 tests and 34 suites. The eight additional parameterized route cases are included in [runtime-cases.tsv](runtime-cases.tsv). [summary.json](summary.json) records the source revision and targeted command.

All owned files are unchanged from baseline source `990edf5a5ee6142dc8331d340c313e76f28e9a2d`. The targeted run passed all 125 runtime cases with none skipped. This validates existing tests, not the proposed replacements. No fresh coverage measurement is claimed. Concurrent toolchain edits were present and are outside this review's write scope.

| Proposed case disposition | Cases |
| ------------------------- | ----: |
| Keep                      |    33 |
| Rename                    |    22 |
| Rewrite                   |    52 |
| Delete                    |    10 |

No whole-file deletion is proposed. Counts refer to declarations, not future test totals. Mixed tests retain useful assertions while removing incidental checks. The ledger, rather than filename or migration wording, determines each disposition.

## Recommended decisions

### Keep routing and useful public behavior

Unsafe URL rejection, UUID validation, type-specific destinations, filtering, selection, row callbacks and response normalization protect actual results. Retain these contracts. Remove three duplicate route cases already covered by colocated routing cases; preserve every expanded type scenario. Rename switch-oriented titles and the overbroad claim that any actionUrl is returned verbatim. Existing tests do not certify every possible URL attack or that every returned destination exists as a page.

Replace query-client mock arguments with a real cache and active observers showing notification list and unread-count data refresh. An exact count of two invalidation calls is not a contract: one prefix invalidation can refresh both. Wrong keys or missing invalidation must fail the replacement.

Keep the handler's current unavailable push-registration outcome and no outbound request assertion, with a truthful title. It bypasses validation and makes no validator claim. The accepted [inquiry, settings, and schema review](https://github.com/bc-solutions-coder/bcordes/issues/64#issuecomment-5572568286) owns new notification validator scenarios in `features/notifications/server-fns/validation.test.ts`. Reuse this unavailable-handler protection when those scenarios land, avoiding duplicate cases and silent ownership transfers.

### Exercise actual streams and visible results

Preserve real-provider lifecycle, event delivery, reconnection and cleanup behavior. Correct cases whose setup does not establish the condition in the title: a timer-cleanup claim needs a pending timer; backoff-reset evidence needs prior failures; follower relay needs a real follower setup. Replace mock-only subscription checks with delivery through the actual provider and absence of callbacks after cleanup.

The bell's event case currently observes invalidation without proving its promised unread badge increment. Its replacement must deliver an event, refresh a controlled server result, and show the updated badge. Page tests should exercise actual filtering and selection rather than canned owned-hook outputs. Preserve the current distinction that the bell awaits a read mutation before navigating while the page navigates immediately.

`useEventStreamEvents` currently subscribes on the stable subscribe dependency and does not react to changed handler maps. The current page caller captures a stable query client. This review specifies existing delivery/cleanup protection and makes no claim of dynamic handler replacement support or a demonstrated customer regression. Do not silently add a new dynamic-subscription product contract during cleanup.

### Preserve row appearance without testing class tokens

Keep public checkbox/click callbacks, content and timestamps, strengthening fixed-clock formatting evidence where required. Replace unread/read font-class checks with a real browser comparison of distinct read states and their transition, with fixed data, theme and viewport. Do not add an assumed accessible unread marker that the product does not currently expose.

Proposed new browser file: `apps/web/e2e/tests/notification-appearance.spec.ts`, owned by this review for these replacement scenarios. The browser review and final handoff must account for this accepted replacement ownership. Browser evidence does not replace measured Vitest coverage or waive per-area coverage checks.

### Scope push hook tests honestly

Real hooks with controlled browser APIs and server-function outcomes can test permission handling, registration state, request payloads and propagated rejection. Their simulated successes do not prove production device registration or delivery: production push operations currently reject as unavailable. Remove console-string and call-only evidence where returned state, arguments, cleanup or rejection is the actual contract. Coordinate with the accepted settings review's isolated UI-success and real-unavailable scenarios; do not invent working server endpoints.

### Remove inert pagination checks and track real gaps

Load more updates page state that no consumer reads. Filtering neither slices results nor requests another page, and the server fetch is fixed to page one. The button/updater tests do not protect working pagination. Delete those cases and remove incidental page-state assertions from otherwise useful filter tests. This does not authorize removing the product control during planning.

Two newly filed decisions block final handoff:

- [Decide notification pagination behavior and coverage](https://github.com/bc-solutions-coder/bcordes/issues/81): choose an honest limited list or actual pagination, then specify observable evidence.
- [Decide notification bell read-failure behavior and coverage](https://github.com/bc-solutions-coder/bcordes/issues/82): decide navigation and recovery when an individual read request fails; the current bell can leave navigation blocked with an unhandled rejection.

These gaps are not counted as verified replacements and do not prevent classifying existing tests. No existing failure toast is invented for the bell, and runner rejection diagnostics must not be suppressed.

## Verification required during implementation

Apply the [accepted coverage safeguards](https://github.com/bc-solutions-coder/bcordes/issues/49#issuecomment-5571864230): reach and enforce 90% for lines, statements, branches and functions before cleanup lands, inspect affected-area losses, and preserve the coverage denominator. Baseline functions are 87.22%; this review does not resolve that shortfall.

Land named replacements before conditional removals. New or substantial rewrites must fail for a relevant deliberate defect, then pass after restoration. Run affected tests during editing, full coverage before merge, and relevant browser/build checks. Refresh inventory for intervening changes and reconcile new browser/validator scenario ownership at final handoff. No source-text assertions or product changes are proposed as shortcuts.
