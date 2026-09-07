# Executable tooling checks

Implementation for [issue 91](https://github.com/bc-solutions-coder/bcordes/issues/91), based on `32560daa12ce930dbdc975ede83c6cda0462a80c`.

The configuration tests now execute real tools against disposable inputs. [dispositions.tsv](dispositions.tsv) maps original package-review keys to deletions and replacements. Compiler inputs use the application's actual inherited configuration: valid typed JSX and an application alias compile without emitted JavaScript; null assignment, implicit any, unused locals and parameters, switch fallthrough, and missing side-effect imports produce their expected diagnostics. The root typecheck command also rejects an injected error in each discovered workspace member, with a valid run before and after restoration.

Oxlint exercises each declaration form individually and retains positive names, suppression, infer/mapped controls, import boundaries, and actual fix-and-recheck outcomes. Its diagnostic fixtures replace the former ESLint configuration inspections in the original ledger; the accepted Oxlint supplement governs the current tool.

The runner probe executes a known case in every discovered workspace project, exercises DOM matchers and automatic cleanup in web, UI, forms, navigation, query and test-utils, resolves the app alias, and rejects a failing assertion. The coverage probe exercises a function through the actual root configuration: an uncovered branch fails the threshold and emits LCOV; exercising both branches passes. Neither probe recursively executes the real repository suite. The fixture copies working files, redirects workspace dependencies to the copies, and leaves dependency code linked while keeping pnpm task state private.

One source assertion was removed early from `architecture-cleanup.test.ts`: “no source reaches deep into a feature/shared/app module.” It incorrectly rejected the deliberately invalid Oxlint input strings. The actual lint-boundary scenarios pass and now cover its supported intent. [Issue 103](https://github.com/bc-solutions-coder/bcordes/issues/103) owns deletion of the remaining guard file. The runner/coverage replacements are also ready for that ticket's alias and coverage guard removals, and for package owners to remove fixed discovery inventories.

## Deliberate defects

Each temporary defect failed its relevant probe with exit 1, and the original file was restored in `finally`:

- Limiting root runner projects omitted a required executed project.
- Skipping the utilities package in root typecheck accepted its injected error, which failed the probe.
- Disabling the type-parameter diagnostic caused the invalid-input test to fail.
- Setting coverage thresholds to zero incorrectly accepted partial coverage, which failed the probe.
- Removing UI setup broke both its DOM matcher and cleanup checks.

Verification results and runtime totals are recorded in [summary.json](summary.json). Coverage thresholds and exclusions remain unchanged. This slice does not claim completion of the parent cleanup or remote CI.

## Review follow-up

Standards review found no documented violations or actionable Fowler smells. Its minor temporary-directory cleanup observation is fixed by discovering packages before creating the directory.

Spec review requested the remaining accepted mutation evidence. All 21 recorded defects now fail the relevant probes, including individual strict-null and implicit-any options, unused locals/parameters, fallthrough, side-effect imports, JavaScript emission, broken alias resolution, class-only diagnostic suppression, each import-boundary category, and a missing boundary file matcher. The class-only mutation fails the assertion for `class.ts` before the aggregate count; enabled emission fails the explicit generated-file check. Each change was restored, followed by a passing configuration-project run. No configuration mutation remains.
