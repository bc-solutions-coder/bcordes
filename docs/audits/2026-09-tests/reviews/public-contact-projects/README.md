# Public pages, contact, and projects review proposal

Draft for [Review public pages, contact, and projects tests](https://github.com/bc-solutions-coder/bcordes/issues/63). **Awaiting human acceptance. No tests have changed and no replacement has been implemented.**

## Complete owned inventory

[dispositions.tsv](dispositions.tsv) accounts for every owned declaration: 222 test cases and 43 suites across 22 files. Each row records the original nested title and location, proposed keep/rename/rewrite/delete, replacement title, assertion-level evidence, replacement needs/location, risk, rationale, and planned verification. [files.tsv](files.tsv) aggregates file-level proposals. [summary.json](summary.json) records the source revision and actual test command.

All 265 declaration keys and titles matched the original inventory exactly. The 22 owned files have no changes since baseline source revision `990edf5a5ee6142dc8331d340c313e76f28e9a2d`; this review inspected `dfbe151b4fc7f5772aa63755e5d43e44bab81e9f`. The targeted run discovered these exact 22 files and passed all 222 cases, none skipped. No parameterized expansion difference exists in this group.

Unrelated untracked Storybook output and toolchain-audit work were present before this review and are outside its write scope. The existing test run is validation of current behavior only; no fresh coverage measurement, replacement verification, or deliberate-defect check is claimed.

| Proposed case disposition | Cases |
| ------------------------- | ----: |
| Keep                      |    90 |
| Rename                    |    17 |
| Rewrite                   |    76 |
| Delete                    |    39 |

No entire file is proposed for deletion. Many rewrites only strengthen a query or remove a weak assertion; this count does not imply 76 new tests. Deleted metadata, shape, count and stub cases have explicit retained or replacement evidence in the ledger. Conditional replacements must pass before corresponding removals can land.

## Recommendations requiring acceptance

### Preserve content contracts and make titles accurate

Keep meaningful rendered copy, project details, skill names, role/employer information, public callback results, filtering outcomes and link destinations. A project description that names React or another library is content, not a migration guard banning implementation dependencies.

Where titles overclaim, either improve the assertion or narrow the title. Timeline's “all timeline entry periods” omits the current Intterra period, so include it and associate dates with the right role. The form's “loading spinner” case actually asserts Sending text and a disabled button; name that pending behavior. Heading/CTA/statistic tests should identify accessible roles or associate labels with values where those relationships are the claimed contract. Keep static content expectations independent of the implementation data when verifying published content; intentional content changes may require deliberate expectation updates.

### Replace route stubs and metadata shape with real output

Remove property-existence checks for route configurations and replace owned-child marker checks with meaningful page content using actual components and routing. Preserve the distinction between component behavior and route inclusion: a component test alone cannot prove a page renders it. Home route loading should prove real featured projects reach rendered project links, rather than compare a stub's array with the same fake array or assert its item count.

Consolidate project metadata constant checks into real project detail/route output, while keeping named project prose and substantive content assertions. Unused `client` metadata has no identified displayed contract in the current detail implementation; do not invent a product field to preserve a constant test. Retain supported metadata/API results where the ledger identifies an observable lookup or transport contract.

### Use inputs that can expose sorting and filtering defects

Both current catalog entries are featured and dated 2025. Tests against only those values cannot detect reversed year ordering or inclusion of non-featured entries.

Exercise the actual catalog functions with controlled metadata inputs for the two existing content modules. Use one pair with different featured years, then another with an older featured project and a newer non-featured project. Re-import the real catalog per isolated input fixture. Assert exact ordered/filtered slugs and prove that reversing sort order or removing filtering fails. Do not mock the result function or introduce a production API just for the test.

Keep controlled ProjectFilter callbacks, tag/year intersection behavior and no-results behavior. Strengthen both reset controls by activating both filters first and then proving the full result set and unfiltered count return. Replace four selected-filter utility-class checks with visible selection-state checks in a real browser.

Proposed browser location: `apps/web/e2e/tests/project-filter-appearance.spec.ts`, owned by this review for these new scenarios. The browser review and final reconciliation must account for this future file. Exercise the actual projects page where possible and compare selected/unselected appearance and its change after selection, not hard-coded Tailwind tokens. Current filter controls do not expose `aria-pressed`; adding that attribute would be an explicit product accessibility change rather than an assumption in these test-only dispositions.

Browser execution is separate from Vitest coverage. Preserve meaningful unit-level selection/callback/result behavior and inspect any affected measured-coverage loss before removing class cases. The accepted global 90% prerequisite and per-area safeguards still apply; browser success does not waive them.

### Strengthen contact submission and permission boundaries

Keep the existing form validation, pending, success, failure, prefill, and callback behavior. Add missing evidence:

- Invalid fields produce errors without sending an inquiry.
- Successful submission carries the entered identity, message, selections and optional-field values to the request boundary.
- Send Another Message returns a visitor to a cleared usable form.
- A failed request preserves input and re-enables retry; exact console logging is not a product contract.
- Known signed-in identity fields are filled and locked while missing identity fields remain editable.
- Contact invitations appear for visitors and users without `InquiriesRead`, and are absent for users with that permission where the implementation already applies that rule.

Keep real owned form behavior and control the external request boundary. A narrow server-call stub can isolate the rendered form, but its invocation alone is not sufficient evidence of successful submission: assert outgoing values and visible outcomes. Actual server authorization/SDK transport coverage remains owned by inquiry/browser reviews; this group does not claim those guarantees from a client-side mock. Reset identity and deferred-request fixtures between cases so later cases do not inherit an earlier scenario.

The nested ContactFormFields field/submit-presence cases duplicate the real parent form's coverage; remove those after the named-field parent assertions remain. Preserve its independent disabled-fields prop behavior. The standalone success-button presence case duplicates the public click callback case, which remains. A public callback is a legitimate component result and is not discarded as an incidental internal mock call.

## Evidence boundaries and follow-through

The resume DOM test establishes a download link and its semantics, not that the PDF can actually be fetched or contains correct information. Browser/tooling artifact verification owns any such assurance. Current content expectations do not certify that time-sensitive marketing or employment claims remain factually current; content corrections remain separate work.

The existing [homepage browser statistic mismatch](https://github.com/bc-solutions-coder/bcordes/issues/53) remains a tracked browser issue. These component tests use current content and do not resolve that browser failure. Cross-group ownership is preserved; no proposed deletion depends on another group's unresolved test disposition. Within this group, a deletion linked to a rewritten case is conditional on that replacement's evidence.

Accepting this proposal chooses the recorded dispositions and replacement requirements, not immediate deletion or a passing coverage claim. Implementation must first meet the accepted coverage gate, refresh the inventory for intervening changes, run affected tests and full coverage, prove new/substantial rewrites fail for the intended defect, and run relevant browser/build checks. Final reconciliation must include proposed new files and all surviving/renamed cases.
