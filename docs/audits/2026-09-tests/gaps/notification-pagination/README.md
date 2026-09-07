# Notification pagination accepted decision

Accepted plan for [Decide notification pagination behavior and coverage](https://github.com/bc-solutions-coder/bcordes/issues/81). The user accepted the limited-list proposal with "looks good lets continue". **Implementation remains pending; no product or test changes implemented.**

Recommend an honest limited-list view for this cleanup: remove the inactive Load more control and unused pagination state, preserve the currently loaded notifications and interactions, and make the limit explicit. Defer full pagination as a separate feature rather than adding an unrequested notification-history redesign to test cleanup.

## Facts and tradeoff

`features/notifications/server-fns/notifications.ts:20` requests page 1 with page size 20, then returns only response.items. The page and bell share the notifications query; the bell takes five entries. `useNotificationFilters` filters the loaded array and counts its unread entries. Its page state is never used to fetch or slice results. Clicking Load more only changes that unused state.

The installed SDK supports pageNumber/pageSize and returns totalCount, totalPages and next/previous-page metadata. It exposes no server-side unread/type filters or ordering option on this operation. No chronological guarantee was found. Full pagination is feasible, but would require deciding filter scope, metadata propagation, shared cache/bell behavior, pending/retry behavior and refresh consistency. It is more than replacing the button handler.

Removing the control loses no working pagination behavior. The limitation remains: users cannot browse beyond the returned first page through this view. The plan must say so; it must not claim complete notification-history access. A future pagination feature is not required to declare this bounded cleanup complete and is not counted as implemented coverage.

## Proposed visible behavior

- Keep fetching the first page with a requested size of 20. Preserve backend order without calling it newest or latest. Do not add client truncation, sorting or new fetch parameters solely for tests.
- Show a persistent scope note: **“Showing up to 20 notifications. Filters apply to this list.”** Display it even when a filter finds no matches.
- Use **“Showing N of M loaded notifications”** for the filtered count, where M is the returned array length and N is the filtered length. Neither number claims the account's total history size.
- For an empty unfiltered response, say **“No notifications in this list.”** For zero filtered matches, say **“No notifications match these filters in the loaded list.”** Do not imply there are no unread notifications anywhere in the account.
- Remove Load more and its unused page/setPage/reset logic. Preserve actual unread/type filtering, selection, item navigation, current invalidation and error handling.
- Preserve the existing account-wide Mark all as read action. The scope note applies to displayed/filterable results; do not turn that action into a selected-only or loaded-only mutation. The bell's independent unread count is not a count of this loaded batch.

These are proposed product copy/control changes to implement alongside the accepted test cleanup. No UI code has changed in this planning decision.

## Required behavior evidence and ownership

This decision owns the additional limited-list scenarios in existing `apps/web/src/routes/dashboard/notifications.index.test.tsx`, `apps/web/src/features/notifications/hooks/useNotificationFilters.test.ts`, and the paging-request scenario in `apps/web/src/features/notifications/server-fns/notifications.test.ts`. The [accepted notification review](https://github.com/bc-solutions-coder/bcordes/issues/65#issuecomment-5572750103) retains ownership of its existing-case dispositions; integrate these requirements into its real-hook/page replacements rather than duplicate them.

| Scenario                                 | Observable evidence                                                                                                                                                  | Deliberate defect                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Full first page is honestly bounded      | Real page with 20 distinct records displays them, the scope note and correct loaded count; no Load more action.                                                      | Restore the inactive control, hide records or claim all account history is loaded. |
| Filters describe the loaded list         | Mix read/unread and types; interact with real controls, assert named results and exact N of M summary, including zero matches and clearing filters.                  | Filter incorrectly, report M as N or show account-wide empty wording.              |
| Short and empty responses are usable     | A short batch has the correct count; an empty batch has the truthful empty message and visible scope note.                                                           | Hard-code 20 as returned count or hide the limit in the empty state.               |
| Filter changes do not fetch another page | Observe requests after initial loading settles; changing filters updates displayed results without requesting page 2. Isolate unrelated event/refocus invalidations. | Add an accidental next-page request or filter only a mocked result.                |
| Server requests the supported first page | Invoke the real server function/SDK against a controlled request boundary; assert pageNumber 1, pageSize 20 and the actual returned entries.                         | Request a different page or return a canned result instead of the response items.  |

No test should assert page-state existence or inspect removed source. Removing the obsolete state is implementation simplification, not a new structural test contract. Existing mutation/read/navigation behavior stays protected by its accepted cases. A new browser file is unnecessary for this gap: real route/component tests and request-boundary evidence establish the limited-list contract, while the accepted browser review retains the production notification flow.

## Verification and completion

The two current page/filter suites passed all 26 cases, none skipped. That includes weak pagination checks and does not prove this proposed behavior. [summary.json](summary.json) records the observed run. No fresh coverage or new scenario execution is claimed.

During implementation, replace the accepted mocked page/filter cases with the real behavior scenarios above, remove obsolete page-state assertions, and verify the listed defects fail before restoring a passing implementation. Run affected tests, relevant browser/build checks and full coverage before merge. All accepted 90% prerequisites and affected-area safeguards remain; do not retain dead state merely to keep incidental coverage.

Acceptance resolves the pagination gap by choosing the limited-list contract. Full history browsing, server-side filters, cursor/page consistency and loading additional batches are explicitly deferred, not hidden implementation obligations. A later full-pagination request requires a separate complete behavior and failure-state design.
