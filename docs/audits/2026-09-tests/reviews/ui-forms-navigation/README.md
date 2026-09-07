# UI, forms, and navigation test review proposal

Proposal for [Review UI, forms, and navigation tests](https://github.com/bc-solutions-coder/bcordes/issues/67). **Awaiting human acceptance; implementation remains pending.**

## Complete inventory and observed evidence

[dispositions.tsv](dispositions.tsv) accounts for every title and its assertions: 159 test declarations and 34 suites across 22 files. Each row records retained and removed assertions, replacement location, rationale, coverage risk and planned defect check. [files.tsv](files.tsv) aggregates the dispositions. [runtime-cases.tsv](runtime-cases.tsv) includes all 202 runtime cases, including 43 additional parameterized variants. [summary.json](summary.json) records the inspected source revision, owned-file hashes and targeted command.

All 193 original declaration keys and titles reconcile exactly with the baseline inventory. The owned files are unchanged from baseline source `990edf5a5ee6142dc8331d340c313e76f28e9a2d`. All 202 current runtime cases passed with none skipped, using the updated installed toolchain. This does not prove the replacements or measure fresh coverage. Unrelated toolchain audit work is outside this review's write scope.

| Proposed case disposition | Cases |
| ------------------------- | ----: |
| Keep                      |    16 |
| Rename                    |     4 |
| Rewrite                   |    70 |
| Delete                    |    69 |

Two whole-file removals are conditional: `packages/forms/package.test.ts` and `packages/ui/package.test.ts`. Their useful public-import, rendering and tooling guarantees must survive in the named replacements. Most remaining rewrites strengthen queries or replace individual assertions; the count does not imply 70 entirely new tests.

## Recommended decisions

### Remove migration and structure assertions

Delete old source-location/import guards, manifest and dependency placement checks, export/function inventories, generated-ID patterns, `data-slot` assertions, and arbitrary class-token expectations. Do not preserve migration history merely by renaming its suite. Do preserve behavior inside mixed cases, including accessible semantics, content, enabled/disabled state, selection and public callbacks.

Exercise public `@bcordes/forms`, navigation and UI imports through actual rendered consumers before removing entrypoint shape checks. The [accepted package infrastructure review](https://github.com/bc-solutions-coder/bcordes/issues/66#issuecomment-5574002451) owns `packages/config/runner-behavior.test.ts` for actual discovery/execution and shared setup. The two package collection cases depend on that accepted replacement during implementation; this group does not create duplicate tooling tests or claim that replacement already passes.

### Preserve form behavior and accessibility relationships

Keep invalid input rejection, error messages, labels, descriptions and public value propagation. Strengthen submission coverage to correct invalid input, submit successfully, assert the exact payload and confirm error recovery. Public form tests should use the real owned components and controller behavior.

Replace generated-ID spelling and structural markers with the actual label/control relationship, accessible description and invalid state. A generated identifier may still be followed to verify a relationship; its format is not the contract. Replace styling-prop string checks with a measured rendered effect in the browser.

The hook test claiming a clear error outside FormField mounts without any form context and merely asserts a throw. Rename it to the missing-context behavior it demonstrates. Do not claim the intended FormField diagnostic is reached or introduce a new product error as part of cleanup.

### Use real navigation and meaningful fixtures

Current navigation Link mocks implement their own route-matching algorithm. Replace this with a real memory router and public component imports, asserting named links, destinations and navigation results. Keep custom injected navigation items: this is reusable component behavior rather than a migration-only restriction on site names.

For exact matching, compare the same non-root path with exact enabled and disabled at its own and child destinations. The current root special case cannot detect the missing flag. Verify actual current-page semantics where available; use browser evidence for a claimed visible active distinction. Do not recreate the router's matching logic in a mock.

Make mobile trigger tests open and dismiss the real sheet, show navigation content and report public open-state changes. Verify link activation and the public onNavigate callback. MobileNav delegates closing to its parent; do not silently require automatic closing by the component itself. Preserve injected brand/actions and prove actions remain usable. Empty-item checks should detect any unexpected item link, not only Home and Projects.

### Preserve visible contracts without freezing CSS implementation

This review owns new browser scenarios in `apps/web/e2e/tests/ui-component-behavior.spec.ts`, with a test-only fixture harness if needed. Render the real components, router and package styles under controlled viewport/theme/data. Existing app pages can serve scenarios they actually expose; arbitrary component fixtures should not require a production showcase route. Include any fixture files in final reconciliation.

The ledger specifies scenarios for public button/badge variants and sizing, caller customization, sheet placement, switch/thumb and progress appearance, avatar image states, form trigger/content customization, and navigation active appearance. Preserve a supported distinction or measurable effect rather than a Tailwind token, wrapper hierarchy or exact theme variable. Use relative geometry or targeted visual evidence as appropriate; do not snapshot entire pages to protect a small prop.

The avatar failure case must establish a real failed image request and visible fallback, contrasted with successful loading. Sheet placement must check actual viewport bounds for the default right side and all explicit sides. Progress must show the requested fill proportion, rather than require an inline width and prohibit an equivalent transform. A class-forwarding scenario needs CSS with an observable effect; merely finding its string on an element is insufficient.

Retain accessible state and interaction tests in Vitest. Browser results do not contribute to its measured coverage and cannot waive affected-area safeguards. If moving an appearance case loses meaningful measured coverage, preserve the relevant component behavior in Vitest and review the loss before removal.

### Keep overlay and primitive tests truthful

Keep real dialog/menu/tab/select interactions, content visibility, checked state, disabled controls and public callbacks. Use semantic queries and actual controlled/uncontrolled transitions where the ledger calls for them. Remove redundant root/trigger/content marker checks once the corresponding behavior remains.

Controlled-open tooltip tests establish controlled rendering; they must not be renamed as hover behavior without an actual pointer scenario. Assertions about a selected navigation link can use the existing current-page semantics. Do not invent accessibility attributes or new product states to make a proposed test easier.

## Implementation prerequisites

Apply the [accepted coverage safeguards](https://github.com/bc-solutions-coder/bcordes/issues/49#issuecomment-5571864230): reach and enforce 90% lines, statements, branches and functions before cleanup lands, inspect affected-area changes and preserve the coverage denominator. Baseline functions are 87.22%; this review does not resolve that shortfall.

Land named replacements before conditional removal. Every new or substantial rewrite must fail for a relevant deliberate defect—wrong destination, lost label association, wrong form payload, disabled interaction firing, missing style effect, wrong sheet side or failed avatar fallback—then pass after restoration. Run affected tests during editing, full coverage before merge, and relevant browser/build/tooling checks. Refresh inventory and commands for intervening changes. Notify the browser review and final handoff of accepted new scenario ownership before reconciliation.
