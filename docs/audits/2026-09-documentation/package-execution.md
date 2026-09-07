# Package and infrastructure comment cleanup

[Refine package and infrastructure comments](https://github.com/bc-solutions-coder/bcordes/issues/41) covers 179 original audit paths: 62 changed, 113 retained and four excluded. The [execution ledger](package-execution.tsv) also records two verification scripts added in earlier cleanup work and one supporting application test edit. Original entries use the audit blob; those three supporting entries use `aab71d7`.

Removed completed migration stories, repeated test steps and decorative headings. Corrected identity/profile ownership, CSRF token conditions, legacy fixtures, ignored compatibility props, theme overrides and Docker registry authentication. Retained useful test isolation, source-scanning, public-contract and typing comments. No runtime implementation changed.

One existing application test required an ESLint comment to describe retired directories. Removed that test with the obsolete history; boundary enforcement tests remain. No source assertions were added. The application suite has one fewer test.

## Verification

Comparison baseline: `aab71d764841cfb36cfaa4477a0bea96161c744e`.

- `node scripts/check-comment-edits.mjs aab71d7 packages/` found identical emitted JavaScript in all 57 edited package source files. The root ESLint re-export passed the same comparison separately.
- CSS declarations, Docker instructions, Compose configuration and ignore patterns are unchanged after excluding comments and whitespace.
- New local comment links resolve, and shell syntax checks passed.
- All 1,318 workspace tests passed across 123 files, including Tailwind source scanning. An earlier concurrent run timed out in three import tests; the complete run passed without other checks competing for resources.
- Workspace typecheck and full lint passed. Lint used an 8 GB Node heap; the final two corrections also passed focused lint.
- Production build, public-page/asset smoke checks and all 24 Chromium browser tests passed using the local fixture backend and disposable Valkey.

The compiler check excludes comments and formatting; types, directives, source scans and production behavior require separate checks. The application test deletion and removal of its unused source read are intentional exceptions to syntax equivalence.

Live Wallow integration remains tracked in [release verification](https://github.com/bc-solutions-coder/bcordes/issues/31). The next cleanup ticket is [complete repository verification](https://github.com/bc-solutions-coder/bcordes/issues/42).
