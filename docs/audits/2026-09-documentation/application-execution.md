# Application comment cleanup results

[Application comment cleanup](https://github.com/bc-solutions-coder/bcordes/issues/40) covers all 183 application paths in the original audit: 83 edited, 89 retained and 11 excluded assets or generated files. The [execution ledger](application-execution.tsv) records each outcome against the original blob. All 82 planned edits are included; the project detail route also lost redundant JSX labels. No application files were added or removed.

The edits remove test-step narration, decorative labels, completed migration stories and unused analytics examples. Remaining comments explain constraints such as source-scan self-matches, query hydration, browser fixtures and SSE coordination. Stale schema-copy, UI-library and event handling descriptions now match the implementation. Shared background links to the current guides.

## Verification

The comparison baseline is `b1920cc0e00e483be4e815eb216b15fde3d2a6ad`, after the standalone documentation rewrite. Run `node scripts/check-comment-edits.mjs b1920cc apps/` to compare emitted JavaScript syntax with that baseline. All 81 edited JavaScript/TypeScript files match, including test names, fixtures and assertions. The checker ignores comments and formatting; it does not establish type, directive, CSS or build equivalence.

- All 882 application tests passed across 79 files, including the Tailwind bundle check.
- Recursive workspace typecheck and full lint passed; lint used `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build and public-page/asset smoke checks passed. All 24 Chromium browser tests passed against the production artifact.
- CSS rules and directives match after removing comments and whitespace. Required lint suppressions and source-scanning constraints were retained.
- New local comment links resolve. Markdown links and formatting were checked separately.

Browser verification uses the local backend fixture and disposable Valkey. Live Wallow release verification remains tracked in [issue 31](https://github.com/bc-solutions-coder/bcordes/issues/31). Package and infrastructure comments continue in [issue 41](https://github.com/bc-solutions-coder/bcordes/issues/41).
