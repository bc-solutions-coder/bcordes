# Package infrastructure test accepted review

Accepted plan for [Review package infrastructure tests](https://github.com/bc-solutions-coder/bcordes/issues/66). The user responded "lets continue" to the complete proposal and acceptance question; this is recorded as acceptance. **Implementation remains pending.**

## Complete inventory and observed evidence

[dispositions.tsv](dispositions.tsv) accounts for all 287 baseline declarations: 215 tests and 72 suites in 19 files. It records original and current locations, every title and assertion disposition, replacement location, risk, rationale and planned verification. [files.tsv](files.tsv) aggregates decisions. [runtime-cases.tsv](runtime-cases.tsv) records the 214 current runtime cases, all passing and none skipped. [summary.json](summary.json) records the inspected revision, command and owned-file hashes.

Concurrent toolchain work removed one test from `packages/test-utils/package.test.ts`: baseline line 104, “owns the workspace render-provider deps it wraps”, with two dependency-manifest assertions. The ledger retains that original row as delete with no current line; subsequent declarations shift seven lines. Every other owned test file matches baseline source `990edf5a5ee6142dc8331d340c313e76f28e9a2d`. No parameterized expansion difference exists. The 214-case run reflects this working tree, not a pristine historical checkout. Unrelated toolchain changes are preserved.

Disposition totals appear in the summary and table below. They include the already-removed baseline case. Existing-test success is not replacement verification, and no fresh coverage measurement is claimed.

| Proposed baseline case disposition | Cases |
| ---------------------------------- | ----: |
| Keep                               |    53 |
| Rename                             |     5 |
| Rewrite                            |    17 |
| Delete                             |   140 |

Five whole-file deletions are conditional: auth and server package scaffold tests, the query entrypoint suite, utility package migration tests, and Valkey package migration tests. Auth's two useful fixture cases move to new `packages/auth/src/testing/index.test.ts`, owned by this review, before its old file is removed. Other mixed package files retain rewritten behavior tests. Case dispositions distinguish relocation from deletion; whole-file removal does not mean discarding useful assertions.

## Recommended decisions

### Remove migration scaffolding and execute public consumers

Remove old-location checks, banned import searches, importer counts, dependency-placement checks, manifest conventions, symlink targets and exact export inventories. Passing them does not demonstrate useful current behavior. Do not retain migration scaffolding just because its title can be renamed.

Preserve public package use through real execution. Utility tests should call the public entrypoint and assert class merging and date output. Wallow tests should invoke current SDK-backed factories with controlled HTTP/auth/cache boundaries and assert actual requests and responses. Logger tests should emit records in fresh subprocesses and verify message, severity, child bindings and filtering. A module full of functions or a mocked logger method is insufficient.

Retire the unused private Wallow testing helper and its tests together. It models the legacy HTTP-method interface rather than the current SDK. The consumer search found only its own tests/implementation and a separate negative export assertion, not an actual caller. Before implementation removes the helper source and `./testing` export, repeat the search and run consumer typecheck/build. Do not add new tests to preserve this unused fake interface. This is a proposed test-support retirement, not removal of the SDK-backed application API.

### Keep exact values when they define behavior

Retain date formatting, class-merger output, authorization results, redaction and Valkey key contracts. A class string returned by `cn` is the public function's result, unlike a UI test that inspects incidental styling tokens. Valkey key strings define cache and lock namespaces. Redacted-user allowed fields define the privacy boundary; exact keys are useful here.

Strengthen long-secret redaction to the exact expected redacted result. Its current prefix/suffix checks could pass while leaking the secret in between. Retain the exact allowed-key privacy check and remove the adjacent redundant denied-key assertions.

Correct titles that overclaim session expiry when the fixture only returns an authentication failure, or incremental streaming when the response contains a prebuilt string. Preserve actual middleware rejection/redirect and response-header/body behavior. Additional untested branches are coverage candidates, not evidence that an existing source assertion protects them.

### Prove cache, provider and connection behavior

Replace QueryClient instance/shape checks with separate contexts that cannot read one another's cache. Prove that rendered consumers use the supplied cache and its freshness settings. Keep hydration evidence that server-provided data is rendered without refetching. Replace mocked devtools markers with the real inspector reading a seeded cache. Export enumeration does not certify production delivery or bundle exclusion.

Keep Valkey observable client reuse and exact namespace outputs; strengthen argument/configuration-only evidence where actual connection behavior is intended. `lazyConnect` is not proof of no connection: the owned factory explicitly connects. Do not invent a no-connect contract from that option name. Control the external transport instead of needing a live production cache.

### Test tooling outcomes rather than configuration text

Configuration can be tested behaviorally by running its tools on valid and invalid fixture inputs. Compiler fixtures should demonstrate accepted code and relevant diagnostics using actual configuration, without copying options. Recursive typecheck coverage should fail when an included file in each workspace member has a deliberate type error. Use isolated disposable checkouts, not mutations to the shared workspace.

Lint fixtures should exercise actual permitted and forbidden imports and inspect resulting diagnostics. Their source files are tool inputs, not source text being searched for implementation structure. Do not freeze `tsc`, ESLint, script strings or package counts as the contract; the concurrent toolchain migration may change executables while preserving diagnostics. Refresh implementation details before executing this plan.

This review owns new `packages/config/runner-behavior.test.ts` scenarios consolidating package discovery/execution and shared DOM setup. Use actual root runner configuration with isolated known-pass/known-fail fixtures; prove omitted projects fail the probe. Exercise DOM cleanup and matchers through actual test results. Avoid recursive invocation of the probe, permanent test-file lists and source scans. Existing package collection cases can be removed only after this replacement works.

Keep real test-utils provider behavior: public rendering, asynchronous query results, retry behavior, separate-render cache isolation and caller options. Remove exported-name counts and assertions that test-utils happens to depend on particular workspace packages. New replacement files and scenarios remain owned by this review and must enter final inventory reconciliation.

## Implementation prerequisites

Apply the [accepted coverage safeguards](https://github.com/bc-solutions-coder/bcordes/issues/49#issuecomment-5571864230): reach and enforce 90% lines, statements, branches and functions before cleanup lands; compare affected areas and preserve the denominator. Baseline functions are 87.22%. Tooling checks alone do not remedy that shortfall.

Land and verify named replacements before conditional removals. For each substantial rewrite, introduce its relevant defect—leaked secret, wrong cache, missing project, ignored type error, wrong credentials or missing log—and require failure, then restore and pass. Run affected tests during editing, full coverage before merge, and relevant build/runtime/tooling checks. Refresh owned files and runner/compiler versions for concurrent changes. No source assertions or coverage exclusions are proposed as shortcuts.
