# Browser behavior test review proposal

Proposal for [Review browser behavior tests](https://github.com/bc-solutions-coder/bcordes/issues/68). **Awaiting human acceptance; implementation remains pending.**

## Complete inventory and observed evidence

[dispositions.tsv](dispositions.tsv) records all 24 test declarations and six suites across four files, with assertion dispositions, replacement locations, rationale, coverage risk and planned verification. [files.tsv](files.tsv) aggregates decisions. [runtime-cases.tsv](runtime-cases.tsv) accounts for all 24 current Chromium cases; no parameterized expansion difference exists. [summary.json](summary.json) records the reviewed revision, file hashes, commands and inherited scenario ownership.

All 30 declaration keys and titles match the baseline. The sole owned-file change from baseline source `990edf5a5ee6142dc8331d340c313e76f28e9a2d` is the homepage statistic assertion: exact `7+` replaced `6+` in commit `25e5bc1`. [The statistic correction](https://github.com/bc-solutions-coder/bcordes/issues/53#issuecomment-5572381064) is closed. Keep the current published value; do not restore the obsolete expectation.

Observed verification: a fresh `pnpm build` succeeded, then the full Chromium suite passed **24/24**, no skips, failures or flaky results, against that production artifact with the local fixture backend and isolated ports starting at 3300. Owned hashes stayed stable during review. This is evidence for current tests, not replacement verification or live external-service certification. No fresh Vitest coverage measurement is claimed.

| Proposed case disposition | Cases |
| ------------------------- | ----: |
| Keep                      |     7 |
| Rename                    |     2 |
| Rewrite                   |    12 |
| Delete                    |     3 |

No entire file is proposed for deletion. The three deleted header-presence cases are conditional on a replacement that still visits each original starting page. A home-only navigation check would not justify those deletions.

## Recommended decisions

### Keep public page behavior and make weak assertions meaningful

Retain production response status, named headings, published content and redirect destinations. Strengthen hero actions by scoping them to the hero and following their destination links; the first Get in Touch link can belong to the header. Pair each statistic with its label so swapped numbers fail.

Consolidate repeated navigation presence checks into real navigation from home, about, projects and contact, preserving visibility and hrefs on every starting page. Verify destinations after activation. Retain the HTTP inquiry redirect check with a truthful title: it proves a no-follow 307 response and returnTo location, not browser login completion or access control for every dashboard route.

Replace “any h3 exists” with named project cards and expected links. Replace count-sentence regexes with correct counts and named results before filtering, after filtering and after reset. For project detail, verify a known slug and its matching title/content rather than any h1. Keep the independent unknown-slug 404 outcome. The accepted project-filter appearance scenarios remain separate visual evidence, not ownership transferred to this review.

### Observe contact requests and complete reset behavior

The fixture backend currently returns constant success without parsing the inquiry body. Keep the actual form interaction and confirmation, but require isolated backend evidence of the correct method, submitted fields, enum values, optional defaults and service credential category. A wrong payload must fail even if the UI displays success. Have the fixture validate or respond to the observed input rather than silently accepting arbitrary data.

For empty submission, observe the actual inquiry operation after auth initialization and prove no submission reaches the backend. Broad URL matching on any `/_server` POST is weaker than operation-specific evidence. For reset, include optional phone/company fields and all selectors, then submit the cleared form and verify required errors with no second inquiry POST.

Guest requests currently share the service token, so token-based partitioning alone cannot isolate them. Use a fresh exclusive backend/application fixture for a guest scenario or a demonstrated scenario-scoped observation mechanism. Avoid clearing a shared log while parallel tests run. These are test-fixture changes owned by this review, not production tracing requirements.

### Prove the correct session and notification result

The backend's request list is global, and its authenticated boolean treats both service and user credentials as authenticated. A matching entry can come from another test or the wrong credential type. Expose safe per-test session correlation and record method/path plus credential ownership/category, without reporting raw tokens. Prove the current authenticated inquiry request used its own user session and the submitted-inquiries operation, while preserving the empty-state assertion.

Notification read state is already partitioned by exact session token; preserve that isolation. Scope bell controls and content to the open bell rather than document-order `.last()` selectors. Assert initial unread state, this session's mark-all request, refreshed zero unread state and persistence after reload. Do not claim the new notification appearance scenarios are implemented by this existing case.

### Keep security boundaries and add successful controls

The SDK-named test exercises actual HTTP outcomes and remains valuable behavior. Split its independent protections into truthful cases: cross-origin logout rejection preserving the same user, invalid CSRF rejection under a trusted origin, successful trusted logout ending the session, and direct API unavailability without forwarding.

Exercise origin rejection on an actual mutation endpoint captured from a legitimate isolated interaction. The current unknown endpoint alone cannot show that a supported operation is protected. Once the real endpoint and successful control are verified, remove the unknown-path-only assertion; no separate nonexistent-endpoint contract is proposed. Preserve the observed response security header. A rejects-everything implementation must fail the successful controls, and a rejected mutation must produce no additional backend write.

These outcomes run against the local controlled identity/backend fixtures. They do not prove a complete external identity-provider login or live service delivery, neither of which is part of this cleanup certification.

## Inherited browser scenario ownership

All four planned files remain absent at this review. They are accepted implementation requirements owned by their originating reviews, not additional cases silently assigned here:

| Planned file under apps/web/e2e/tests               | Owning decision                                                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| shell-motion.spec.ts                                | [Shell, routing, auth, and motion review](https://github.com/bc-solutions-coder/bcordes/issues/62#issuecomment-5572176302)    |
| project-filter-appearance.spec.ts                   | [Public pages, contact, and projects review](https://github.com/bc-solutions-coder/bcordes/issues/63#issuecomment-5572322085) |
| notification-appearance.spec.ts                     | [Notification review](https://github.com/bc-solutions-coder/bcordes/issues/65#issuecomment-5572750103)                        |
| ui-component-behavior.spec.ts and test-only harness | [UI, forms, and navigation review](https://github.com/bc-solutions-coder/bcordes/issues/67#issuecomment-5574059693)           |

Final reconciliation must include every future file and fixture without duplicate scenarios or omissions. Share fixture infrastructure where useful, while retaining each behavior's owner. This review owns changes supporting its four existing files, including safe backend observations and isolated request fixtures.

The separate [shell error/auth validation](https://github.com/bc-solutions-coder/bcordes/issues/78), [notification pagination](https://github.com/bc-solutions-coder/bcordes/issues/81), and [bell read-failure](https://github.com/bc-solutions-coder/bcordes/issues/82) decisions remain unresolved final-handoff inputs. Current browser success does not resolve them.

## Implementation prerequisites

Apply the [accepted coverage safeguards](https://github.com/bc-solutions-coder/bcordes/issues/49#issuecomment-5571864230): reach and enforce all four 90% Vitest metrics before cleanup lands, inspect affected areas and preserve the denominator. Browser execution does not contribute to that measured percentage.

Land named replacements before deletions. Require new or substantial rewrites to fail for a relevant deliberate defect—wrong request body or identity, leaked cross-test observation, missing navigation, wrong result count, unpersisted read state or rejected valid operation—then pass after restoration. Build the actual artifact before full browser verification, inspect retries/flakiness rather than treating them as clean first-pass evidence, and refresh inventory and fixtures for intervening changes. Do not introduce raw-source assertions to simplify boundary detection.
