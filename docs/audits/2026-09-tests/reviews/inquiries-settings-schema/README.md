# Inquiries, settings, and schema accepted review

Accepted plan for [Review inquiries, settings, and schema tests](https://github.com/bc-solutions-coder/bcordes/issues/64). The user accepted the complete proposal with "looks good". **Implementation remains pending; this review changes no tests.**

## Complete owned inventory

[dispositions.tsv](dispositions.tsv) accounts for all 104 test declarations and 28 suites across eight files, including nested titles, assertion dispositions, replacement locations, rationale, coverage risk, and planned verification. [files.tsv](files.tsv) aggregates decisions. [runtime-cases.tsv](runtime-cases.tsv) records all 113 passing runtime cases, including the nine additional cases expanded from parameterized schema declarations. [summary.json](summary.json) records the inspected revision and targeted command.

All 132 declaration keys and original titles reconcile exactly with the inventory. The owned files have not changed since baseline source `990edf5a5ee6142dc8331d340c313e76f28e9a2d`. The targeted run passed 113 cases, none failed or skipped. This is evidence about existing tests, not proof of proposed replacements. No new coverage measurement or deliberate-defect verification is claimed.

| Proposed case disposition | Cases |
| ------------------------- | ----: |
| Keep                      |    11 |
| Rename                    |    14 |
| Rewrite                   |    43 |
| Delete                    |    36 |

These are declaration counts, not a target future test count. Rewrites may retain useful assertions while replacing weak ones. Two whole-file deletions are conditional on the replacements below: `src/__tests__/schema-validation.test.ts` and `features/inquiries/lib/inquiries.test.ts`.

## Replace copied schemas with actual validation behavior

The schema file constructs local copies rather than exercising production validators. Its copied status schema accepts any string while production restricts status to an enum. Passing these cases cannot establish that production rejects malformed input.

Move inquiry validation scenarios to the actual inquiry server-function tests. Use real server-function requests where practical, or a thin harness that executes the actual validator supplied to `inputValidator` before invoking its handler. The current no-op validator mock is insufficient. A harness proves the configured validation and handler behavior, not framework transport wiring. Do not copy schemas or introduce production exports solely to inspect implementation.

Preserve every expanded input choice, malformed and valid UUID case, and field-length/URL boundary in the ledger. Invalid input must fail before external side effects; valid input must reach the authorized operation with the expected request values. Cover the production status enum and comment limit, which the copies omit. Deliberately bypass the relevant validator or loosen its constraint and require the corresponding replacement to fail.

The copied notification validators also need real operation coverage. This review proposes and owns the replacement scenarios in `apps/web/src/features/notifications/server-fns/validation.test.ts`: actual `markNotificationRead`, `deregisterPushDevice`, and `registerPushDevice` input validation. This is new scenario ownership, not a transfer of existing notification-review cases. Notify [Review notification tests](https://github.com/bc-solutions-coder/bcordes/issues/65) and [Assemble the test cleanup handoff](https://github.com/bc-solutions-coder/bcordes/issues/51) on acceptance so final reconciliation prevents duplication.

Push registration and deregistration currently return an unavailable-contract error for valid authenticated input. Assert that outcome and no outbound push request; do not claim registration succeeds. Production validates URL syntax, not an HTTPS-only policy. Keep invalid-input rejection distinct from valid input reaching the unavailable operation. This proposal specifies these replacements itself and does not depend on an unresolved notification-review decision.

## Prove inquiry permissions, requests, and visible status

Preserve session expiry, ownership, staff access, internal-comment privacy, and rejection of unauthorized writes. Replace vague request counts with evidence that the prohibited mutation never reaches the boundary. Signed-in submission identity needs a credential-aware request fixture; an SDK fixture with no authentication cannot prove identity propagation.

Route permission scenarios must use opposing role and `InquiriesRead` fixtures so a role-only implementation would fail. Exercise real route loading, nested content, redirects, and navigation rather than configuration shape or mocked Outlet markers. Retain useful empty states, comments, pending controls, draft recovery, and internal-note reset behavior.

Delete constant-map roundtrips and color-string checks only after consumer protection exists. Assert all four explicit inbound and outbound status mappings at the service boundary, all four list labels, and all four status changes with refreshed output. A pair of incorrectly matching maps must fail. Detail currently displays lowercase status text with underscores replaced; do not silently change that contract to the list's capitalized labels. Exact Tailwind palette tokens have no separately identified supported contract.

The list refresh-failure case currently removes all process-level unhandled-rejection listeners. Its replacement must characterize the rejected operation without suppressing runner diagnostics. Inquiry detail comment failures currently log rather than show a toast: retain input/retry behavior without inventing a new toast requirement. List status-update errors do have visible feedback and should assert it.

## Make settings tests prove the claimed outcome

Test real loaded preference states, correct channel requests, pending optimistic state, preserved other channels, and rollback after rejection. Replace implementation attributes such as `data-unchecked` with control semantics. Do not assume switches already have accessible names; any accessibility product change must be explicit.

Two tests titled as error-toast checks currently only assert that a mocked method was called. Replace them with rendered error feedback and absence of success feedback. Successful settings actions likewise need their actual visible result. Signed-out route tests should prove the redirect and preserved return destination, plus no protected data load, rather than merely observe an auth helper call.

Separate isolated push UI contracts from current service capability. Controlled public-hook success outcomes can test that the component shows its success message and updated state. Those cases do not establish real registration, deregistration, or delivery. Exercise the real hook against the current authenticated unavailable server path for failure feedback and absence of success. Do not fabricate working device endpoints to make an integration claim. The row-level ledger scopes these success and failure cases explicitly.

## Implementation prerequisites

The [accepted coverage safeguards](https://github.com/bc-solutions-coder/bcordes/issues/49#issuecomment-5571864230) apply unchanged: achieve and enforce 90% for lines, statements, branches, and functions before cleanup lands; compare affected areas; do not expand exclusions or lower thresholds. Baseline functions are 87.22%, so current coverage does not satisfy that prerequisite.

Land and verify named replacements before conditional deletions. For each new or substantially rewritten behavior test, introduce a relevant defect (wrong mapping, missing permission guard, invalid input accepted, missing feedback, or failed rollback), require failure, then restore and pass. Run affected tests while editing and full coverage before merge, plus relevant router/browser/build checks. Refresh the inventory for intervening changes. Planning acceptance is not implementation verification.
