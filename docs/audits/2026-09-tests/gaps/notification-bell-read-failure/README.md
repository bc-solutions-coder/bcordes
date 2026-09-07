# Notification bell read-failure accepted plan

Decision: [Decide notification bell read-failure behavior and coverage](https://github.com/bc-solutions-coder/bcordes/issues/82).

Status: accepted plan; implementation pending. User accepted: “yes lets continue”. Source inspected at `ddf3c7d2154f18ae2981ca53677bbe99366a8d7c`.

## Accepted decision

Opening a notification should navigate immediately to its existing destination, even while marking it read is pending or when that request fails. Marking read records state; it should not gate access to the destination. This aligns the bell with the notification page and intentionally changes the bell's current success timing as well as its failure behavior.

For an unread notification, attempt the individual read request. On failure, handle the rejection and show `Failed to mark notification as read`, matching the page's current message. Feedback must remain visible after navigation. Do not show a success message or locally clear the unread state because a request was attempted. A later authoritative fetch may change that state, including when a server accepted a write whose response was lost.

On success, refresh notification data and the unread count through the existing invalidation behavior. Already-read notifications navigate without a write. A later click on a still-unread item retries the read request; the existing account-wide Mark all as read action remains another option. No new retry control or automatic retry policy is required. Preserve existing route selection and mark-all behavior.

## Observed behavior

`NotificationBell.tsx` awaits the read request before invalidating and navigating. Its click handler has no rejection handling, so rejection bypasses navigation and can become unhandled. The notification page already uses a read mutation with an error toast and navigates immediately. Bell tests cover successful individual reads and mark-all failure, but not individual-read failure. These are distinct operations; the latter test does not cover this gap.

## Behavior coverage and ownership

This decision owns the additional pending, failure and retry scenarios in existing `apps/web/src/features/notifications/components/NotificationBell.test.tsx`, and one integrated failure/recovery scenario in existing `apps/web/e2e/tests/dashboard.spec.ts`. No new test file is needed. Existing-case dispositions remain owned by [Review notification tests](https://github.com/bc-solutions-coder/bcordes/issues/65) and [Review browser behavior tests](https://github.com/bc-solutions-coder/bcordes/issues/68); apply this decision when reconciling the bell's former wait-before-navigation behavior.

Use the rendered bell with real routing, query state, invalidation and notification route selection. Control only external data/request boundaries. Use a deferred request to demonstrate destination navigation before settlement, then reject it and observe feedback. A mock navigation function alone does not establish that the intended destination is reachable or that the toast survives navigation.

Required outcomes:

- Clicking an unread item reaches its actual destination while the read request is still pending.
- A rejected read displays the failure message after navigation, leaves the fixture's server state unread and does not falsely reduce the badge. Use a fixture with a known unread count and no concurrent events.
- Reopening the bell and clicking the still-unread item attempts the request again. After a controlled success, a real refetch shows the authoritative read state and updated badge; reopening or reloading confirms persistence.
- Clicking an already-read item reaches its destination without issuing a read request. Successful unread-item navigation still reconciles both list and unread count.
- No unhandled rejection or browser page error occurs. Keep normal runner diagnostics enabled; do not catch errors in the test merely to hide an application failure.

The built-browser scenario uses the accepted per-session synthetic authentication/backend fixture. Inject a controlled individual-read failure without changing server state, then allow a successful retry for that same session. Scope request observations to that test, settle initial requests before interaction, and select the notification inside the bell so the page row cannot satisfy the action. Choose a destination different from the starting page. Inspect visible toast, destination, badge and persisted fixture-backed state; do not assert raw source, CSS tokens or internal mutation structure. This runs locally and in CI with controlled services.

## Verification before implementation lands

Run focused component and browser cases, then the accepted affected-area and final gates. Prove the new assertions fail when navigation waits for the request, failure feedback is removed, a rejected write falsely clears unread state, or success stops reconciling data. Restore the implementation and show passing results. The browser must retain rejection diagnostics throughout this check.

The accepted requirement to reach and enforce 90% for lines, statements, branches and functions still applies. Coverage totals do not replace the observable outcomes above. This plan changes no product code or tests and supplies no new coverage credit.
