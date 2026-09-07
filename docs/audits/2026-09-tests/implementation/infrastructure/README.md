# Query, rendering, cache, logging and utility behavior

Implementation for [issue 94](https://github.com/bc-solutions-coder/bcordes/issues/94), based on `e4b28d3`. [dispositions.tsv](dispositions.tsv) maps all owned original test keys to their current outcome. [summary.json](summary.json) records verification and deliberate defects.

The logger, utilities, Valkey and test-utils package inventories and the query export-inventory file are deleted. Public-entry utility and cache-key tests retain exact supported results. The existing real Valkey SDK integration remains. The connection boundary test now proves import is lazy, first use connects to the configured endpoint, and subsequent use does not reconnect, instead of pinning constructor options.

Query provider tests now write data into separate contexts, render and update the supplied cache, respect caller freshness settings, and consume actual dehydrated server state without refetching. Incidental instance and no-error-unmount checks are removed. Public test-utils consumers exercise asynchronous data, interaction, one-attempt errors, independent render caches, and caller container/base-element options. The real DOM setup/cleanup probes from issue 91 already cover all consuming projects and replace the old setup-file inventory.

Logger tests launch isolated consumers of `@bcordes/logger`. They parse actual production stdout for messages, severities and child bindings, verify filtering and default severity, and verify readable development output and clean process exit. No logger output methods are mocked.

Query inspector tests mount the real TanStack devtools host, display the named plugin, open a seeded query, and read its value from the labeled data editor. The query package now declares the same devtools host version already used by the app as a development dependency. Its Vitest configuration resolves browser entry points and inlines devtools/Solid dependencies, avoiding the server-only implementation. The test enables the supported development mode before loading the plugin and supplies JSDOM's missing `matchMedia` primitive. It restores that environment and local storage afterward. Neither the host, inspector nor owned cache is mocked.

## Verification

All 1,222 full-workspace tests pass without failures or skips. Coverage is 94.23% lines, 93.07% statements, 90.31% branches and 90.83% functions. Every denominator and all four 90% thresholds remain unchanged; no retained source file loses covered lines, statements, branches or functions relative to the preceding slice.

Twelve deliberate defects failed: shared query contexts, ignored provider client, empty inspector, wrong inspector label, enabled query retries, shared render cache, ignored render options, ignored log severity, missing development transport, eager connection, changed cache namespace, and missing class conflict resolution. Every mutation was restored in `finally`. The first eleven preceded the passing full suite; the independent development transport probe was added during review and followed by all three logger tests passing.

Focused files were run throughout. Commands: `pnpm test --coverage --reporter=json`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm format:check`, `python3 scripts/check-docs.py`, and `git diff --check`. Existing browser evidence remains separate; no new browser or remote CI credit is claimed. Final source-guard cleanup can reuse these public consumer outcomes.

## Review

The spec review requested an independent development transport failure probe. A nonexistent transport made the development subprocess assertion fail; restoring the transport passed all three logger cases. Standards review found no documented-standard violations or actionable heuristic findings.
