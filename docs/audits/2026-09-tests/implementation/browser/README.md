# Browser behavior and isolation

Implementation for [issue 92](https://github.com/bc-solutions-coder/bcordes/issues/92), based on `5559de6`. [dispositions.tsv](dispositions.tsv) preserves all 24 original browser keys and accepted dispositions; [runtime-cases.tsv](runtime-cases.tsv) records resulting executed titles. The three repeated navigation-presence cases are consolidated into navigation from all four original starting pages. The former combined SDK case is split into five independent outcomes, leaving 25 browser cases.

Contact tests now run exclusive production application and backend processes. Their service credentials cannot mix observations with other guest scenarios. The backend parses and validates inquiry input; assertions check the actual method, service credential category, fields, enum values, and SDK defaults (`phone: ""`, `company: null`). Empty submission produces no inquiry operation. Reset includes optional fields and every selector, then proves required errors and no second submission.

Authenticated fixtures register distinct tokens and opaque owners. Observations expose ownership and credential category without raw tokens. Inquiry verification requires this session's submitted-inquiries operation. Notification controls are scoped to the open bell; tests verify unread state, this session's mark-all operation, refreshed zero unread state, and persistence after reload. Session teardown removes its state and observations. Backend failure/pending controls affect only matching operations for that owner; direct HTTP verification proved another session remains usable, release restores normal responses, and deleted sessions lose access. Unexpected fixture handler errors fail teardown rather than being discarded.

Public checks activate hero and header links and verify destinations. Header checks still start from home, about, projects and contact. Statistics are paired with labels. Project cases name Wallow and Bcordes, assert their links, verify exact result counts and named filtered/reset results, and open the known Wallow detail before the independent unknown-slug 404 check. The inquiry login test now accurately describes its no-follow 307 and returnTo response.

## Security behavior correction

The independent cross-origin logout control exposed a real gap: logout with an invalid CSRF token failed, but the same untrusted origin with a valid session token succeeded. The old combined assertion could not distinguish those protections. The application now rejects cross-origin logout writes before BFF delegation. The restriction targets logout only; other BFF protocol endpoints retain their existing handling.

The new middleware regression failed with status 204 before the change and passes with 403 after it. Built browser checks separately prove cross-origin rejection preserving the user, invalid-CSRF rejection under the trusted origin, successful valid logout ending an initially authenticated session, direct API unavailability without a session-owned forward, and cross-origin replay rejection of a real successfully executed notification mutation without another backend write.

## Verification

The production build and all 25 Chromium cases pass without failures, skips or retries. Full Vitest coverage passes 1,340 cases: lines 93.98%, statements 92.84%, branches 90.19%, functions 90.15%. The logout guard adds measured production code; no files or branches were excluded and no thresholds were lowered. Browser results remain separate from Vitest coverage. [summary.json](summary.json) records counts and defect outcomes.

Deliberate wrong contact names, hero destinations, project counts, session correlation and read persistence each failed their browser scenario. Rejecting valid logout also fails its successful control. Product mutations were rebuilt before the probe; every source/fixture mutation was restored, with the production artifact rebuilt and browser suite rerun afterward.

Commands: `pnpm build`, `E2E_PORT=34200 pnpm --filter bcordes exec playwright test --reporter=json`, `pnpm test --coverage --reporter=json`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `python3 scripts/check-docs.py`, and `git diff --check`. The pending/failed-response probe exercised the fixture over actual loopback HTTP and was removed after verification.

Future shell, project-appearance, notification-appearance and UI-harness scenarios retain their accepted owners. They should reuse these fixtures. This does not claim live identity-provider validation, deployment, final parent completion or remote CI success.

## Review

Spec review: no findings. Standards review: no hard violations or actionable Fowler smells. Both lifecycle suggestions are addressed: backend teardown cannot skip Redis/container cleanup, attachment failure cannot skip guest-backend cleanup, and each application readiness request has a timeout bounded by the remaining startup budget.
