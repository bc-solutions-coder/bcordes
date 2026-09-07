# Authentication and SDK package cleanup

Implementation for [issue 93](https://github.com/bc-solutions-coder/bcordes/issues/93), based on `80945b0`. [dispositions.tsv](dispositions.tsv) maps every owned original test key to its deletion, retained title, rename or replacement. [summary.json](summary.json) and [coverage-summary.json](coverage-summary.json) preserve verification results.

The auth, server and Wallow package scaffolding files are deleted. Their remaining useful fixture outcomes now live in `packages/auth/src/testing/index.test.ts`: default matching identity and future expiration, explicit overrides, admin capabilities, and overridden admin identity/capabilities. The authorization consumer checks live in `packages/authz/src/fixtures.test.ts`, importing the public auth testing export through its existing dependency. They exercise real authorization predicates without introducing a reverse package dependency. Existing session integration continues to exercise stored fixture sessions through the actual BFF and middleware.

The per-request SDK profile case from the coverage prerequisite moved from auth integration into `packages/wallow/src/client.test.ts`. It now invokes the public Wallow client factory with each session's actual cookie and token. A second case obtains a real service client, validates its token request against the controlled identity endpoint, and performs two authenticated inquiry submissions with distinct returned results. The real Valkey adapter backs both cases. This replaces the obsolete “callable factory” assertion without duplicating the existing session scenario.

Redaction now requires the complete long-secret result, so a leaked middle section cannot satisfy two permissive patterns. The exact public-user key allowlist remains; its redundant negative-key check was removed. Accepted middleware, authorization and response-stream titles were renamed to describe their actual outcomes. Existing response, identity, permission and privacy protections remain.

A fresh search for `@bcordes/wallow/testing`, `wallow/src/testing`, and `createMockWallowClient` found only the obsolete package tests and helper declaration, plus an unrelated negative barrel assertion in test-utils. No application, script or other package consumed the factory. The unused private helper and its `./testing` export are therefore deleted. Current consumers pass typecheck and production build. This intentionally removes test-support code from the measured source tree; no coverage configuration or thresholds changed.

## Verification

The affected packages pass 52 focused cases. The full workspace passes 1,283 cases, none failed or skipped. Coverage is 94.23% lines, 93.07% statements, 90.31% branches and 90.57% functions, with all four thresholds enforced. The added fixture and service-client coverage accompanies removal of the unused helper; the report records the resulting denominator explicitly.

Six deliberate defects fail their corresponding replacement: missing admin capability, ignored overrides, a leaked secret middle, a leaked user email, dropped client cookies, and a wrong service identity. Each was restored in `finally` before the focused and full restored runs. The long-secret defect demonstrates protection the old prefix/suffix checks lacked.

Commands: affected Vitest projects, `pnpm test --coverage --reporter=json`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm format:check`, `python3 scripts/check-docs.py`, and `git diff --check`. No browser coverage credit or remote CI result is claimed. Later package and final guard-removal owners can reuse the runner probes from issue 91.

## Review

Spec review: no findings. Standards review identified a relative cross-package import in the initial fixture test. The authorization assertions now live in the authz package and use `@bcordes/auth/testing`, respecting its existing declared dependency and public exports. Focused session-factory checks remain in auth. No heuristic findings.
