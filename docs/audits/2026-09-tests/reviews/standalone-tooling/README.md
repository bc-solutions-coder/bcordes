# Standalone verification tooling review proposal

Proposal for [Review standalone verification tooling](https://github.com/bc-solutions-coder/bcordes/issues/69). **Awaiting human acceptance; implementation remains pending.**

## Scope and evidence

[dispositions.tsv](dispositions.tsv) accounts for 48 meaningful checks, command contracts and explicitly excluded resources from the entry-point inventory: 41 keep, three rename and four rewrite. **These are not additional behavioral test cases.** Nested app/package/browser cases retain their existing review owners. [summary.json](summary.json) records scope categories, file hashes, revision and observed commands.

This differs from a test-file deletion review. Actual HTTP smoke and executed quality gates remain useful. Historical audit utilities already sit outside standing gates; retaining their archival files does not add source tests to the product suite. No whole-file deletion is proposed here.

Observed this review: fresh production build, production smoke, workspace typecheck and type-aware lint all exited successfully. Documentation-link validation passed. Formatting is checked only for the new review documents; no mutating repository-wide formatter or lint fixer was run. Docker verification, Storybook, full unit coverage and remote workflows were inspected but not rerun in this review. Earlier passing evidence remains tied to its own snapshot.

A safe controlled loopback experiment demonstrated that the current production verifier also exits successfully when all routes return the same wrong generic HTML and asset URLs redirect to placeholder responses. [counterexample.json](counterexample.json) records that result. It proves the named weakness, not that the real application currently serves those responses.

## Entry-point reconciliation

| Baseline entry                                  | Proposed treatment                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root test and coverage commands                 | Retain execution/reporting; implement the already-accepted 90% enforcement prerequisite. Nested cases are not counted again.                                                  |
| Playwright command and fixtures                 | Retain; all existing cases and fixture improvements belong to the [accepted browser review](https://github.com/bc-solutions-coder/bcordes/issues/68#issuecomment-5574135015). |
| Production build                                | Retain actual compilation followed by runtime verification.                                                                                                                   |
| Production smoke wrapper and Node verifier      | Retain launch, response and lifecycle checks; strengthen delivered page identity and direct asset responses.                                                                  |
| Docker verifier and workflow integration        | Retain same-image execution and cleanup; require bounded readiness requests with direct 200.                                                                                  |
| Compiler and lint                               | Retain actual diagnostics; package review owns new diagnostic fixtures.                                                                                                       |
| Formatting, fix commands and pre-commit         | Retain developer-quality workflows, with explicit mutating/read-only distinction.                                                                                             |
| Storybook build                                 | Retain compilation; now a CI gate, not an interaction or visual test count.                                                                                                   |
| Documentation checker                           | Retain link/path/anchor quality checks outside behavioral coverage.                                                                                                           |
| Comment-edit comparator                         | Retain as optional historical audit utility, never a standing product/source-regression gate.                                                                                 |
| Historical documentation audit verifiers        | Preserve archival evidence and snapshot reconciliation tools; not cleanup acceptance gates.                                                                                   |
| Agent templates/guardrails and helper resources | Explicitly excluded from product test-entrypoint counts; do not delete reusable tooling based on test-like syntax.                                                            |
| Test inventory extractor                        | Keep as planning evidence tooling; do not rerun in place over immutable baseline ledgers or turn it into a source gate.                                                       |
| New toolchain collectors                        | `collect-ci.py` and `collect-attempts.py` collect audit evidence; they are not additional test runners and were not executed by this review.                                  |

## Recommended decisions

### Strengthen actual runtime checks

Keep real HTTP status, content type, referenced asset availability and nonempty body checks. Add route-specific delivered content so four copies of unrelated HTML cannot satisfy four page checks. These assertions inspect output from the running artifact, not implementation source. Coordinate minimal smoke identity expectations with the browser review; detailed interactions remain there.

Reject asset redirects rather than silently following them. Current checks sample the first referenced CSS and JavaScript asset; name that scope accurately rather than imply exhaustive dynamic-chunk coverage. Browser/build checks provide complementary evidence. Do not inspect compiled source strings to certify library exclusion or bundle structure.

This review owns new `scripts/verify-production.test.mjs` CLI regression scenarios executed with `node --test`: controlled loopback responses demonstrate known-good success and failure for wrong page identity or redirected assets. Response fixtures are actual tool inputs. Include this future standalone entrypoint in final reconciliation; it is not implemented and contributes no current case count.

For Docker readiness, require direct HTTP 200 and bounded individual requests within the overall deadline. Preserve failure diagnostics and cleanup of owned containers/network. A redirect must not count as readiness, and a hanging response must not exceed the promised bound.

The Docker loop currently checks public serving under two callback/logout configurations; it does not exercise an identity-provider redirect or logout. Rename that contract truthfully rather than claim authentication coverage. Keep the actual browser security/auth boundary scenarios under their accepted owner. No new live identity-provider certification is proposed.

### Preserve CI outcomes through the toolchain changes

Since the inventory, production startup log parsing gained optional-colon compatibility; Docker verification gained an existing-image option; and the workflow now transfers its built amd64 image to the runtime job instead of building again. Preserve that identity between the built artifact and the verified artifact. Do not claim unexecuted architectures were verified.

The workspace now uses Node 24, pnpm 11, TypeScript 7, Oxlint and Oxfmt. CI additionally checks formatting and builds Storybook. The review retains their outcomes rather than old executable names, package placement or YAML strings. Refresh commands before implementation if the toolchain changes again.

Keep root test execution, coverage artifacts, production build/smoke/browser checks, lint/format checks and recursive typecheck. The current Vitest configuration reports coverage but has no thresholds. The [accepted coverage decision](https://github.com/bc-solutions-coder/bcordes/issues/49#issuecomment-5571864230) still requires reaching and enforcing 90% for every metric before cleanup lands. No gate or denominator is weakened by this review.

The [accepted package infrastructure review](https://github.com/bc-solutions-coder/bcordes/issues/66#issuecomment-5574002451) owns real runner-discovery, compiler and lint diagnostic replacements. This standalone review owns retaining the command/CI contracts; it does not duplicate those future test scenarios. Pre-commit processes staged files and does not substitute for tests or remote CI.

Release/deploy workflows are publication orchestration, not test runners. The non-release deploy-ready status is an automatic policy result; a successful publish/build status is not evidence that all runtime or behavior checks ran. No deployment, publication or permission change was performed for this review.

### Keep audit resources outside the permanent suite

Documentation link validation is a developer-quality check, not product behavior coverage. Keep it. The comment comparator parses before/after code to check a historical comment-only claim; historical documentation verifiers reconcile fixed snapshots and execution records. Those uses involve source structure, so they must never become mandatory behavioral-suite or cleanup-regression gates.

They already have no standing package, CI or hook integration. Preserve their existing archival paths and evidence instead of inventing removal work. “Keep” in those ledger rows means archival retention, not endorsement as product tests. A future audit may invoke an appropriate tool for its own explicit evidence requirement; that does not expand this suite's contract.

The inventory extractor and toolchain collectors are likewise audit assets. Agent skill templates and fixture helpers are resources rather than discovered tests. Any future genuine runner must be added explicitly to the inventory; source searches alone do not convert a helper into a test file.

## Implementation verification

Apply all accepted coverage and replacement prerequisites. The planned CLI checks must fail for the demonstrated wrong-output cases and pass after restoration; Docker readiness must fail boundedly for redirects, hanging responses and missing health. Avoid production service side effects: use isolated local fixtures and disposable containers.

Run the relevant commands after implementation and inspect actual exits and diagnostic artifacts. Full unit coverage and browser evidence remain separate. Historical audit completion or configuration-string matches cannot certify the cleaned suite. Reconcile the new CLI test entrypoint with all original and planned test files before final handoff.
