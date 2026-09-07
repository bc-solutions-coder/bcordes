# Lint migration inventory, #57

Oxlint now runs the workspace lint command. The 74-rule baseline maps to 70
native rules, three JS plugin rules and strict-mode parsing for legacy octal.
This records the mapping and tested behavior, not exhaustive equivalence across
every possible program.

The captured pre-migration ESLint configuration had 74 enabled rules on the representative
app, route, auth and query files; UI components and forms disable only
`no-unnecessary-condition`. Oxlint 1.82.0 native rule metadata identifies three
remaining gaps: type-parameter naming, spaced comments and import-group ordering.
Its JS plugin API is still alpha. The user approved trying that implementation;
the isolated results below show that two of the three rules work.

| Existing rule                                            | Candidate replacement                            | Status                                           |
| -------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `for-direction`                                          | `eslint/for-direction`                           | Native rule; explicit effective options retained |
| `no-async-promise-executor`                              | `eslint/no-async-promise-executor`               | Native rule; explicit effective options retained |
| `no-case-declarations`                                   | `eslint/no-case-declarations`                    | Native rule; explicit effective options retained |
| `no-class-assign`                                        | `eslint/no-class-assign`                         | Native rule; explicit effective options retained |
| `no-compare-neg-zero`                                    | `eslint/no-compare-neg-zero`                     | Native rule; explicit effective options retained |
| `no-cond-assign`                                         | `eslint/no-cond-assign`                          | Native rule; explicit effective options retained |
| `no-constant-binary-expression`                          | `eslint/no-constant-binary-expression`           | Native rule; explicit effective options retained |
| `no-constant-condition`                                  | `eslint/no-constant-condition`                   | Native rule; explicit effective options retained |
| `no-control-regex`                                       | `eslint/no-control-regex`                        | Native rule; explicit effective options retained |
| `no-debugger`                                            | `eslint/no-debugger`                             | Native rule; explicit effective options retained |
| `no-delete-var`                                          | `eslint/no-delete-var`                           | Native rule; explicit effective options retained |
| `no-dupe-else-if`                                        | `eslint/no-dupe-else-if`                         | Native rule; explicit effective options retained |
| `no-duplicate-case`                                      | `eslint/no-duplicate-case`                       | Native rule; explicit effective options retained |
| `no-empty-character-class`                               | `eslint/no-empty-character-class`                | Native rule; explicit effective options retained |
| `no-empty-pattern`                                       | `eslint/no-empty-pattern`                        | Native rule; explicit effective options retained |
| `no-empty-static-block`                                  | `eslint/no-empty-static-block`                   | Native rule; explicit effective options retained |
| `no-ex-assign`                                           | `eslint/no-ex-assign`                            | Native rule; explicit effective options retained |
| `no-extra-boolean-cast`                                  | `eslint/no-extra-boolean-cast`                   | Native rule; explicit effective options retained |
| `no-fallthrough`                                         | `eslint/no-fallthrough`                          | Native rule; explicit effective options retained |
| `no-global-assign`                                       | `eslint/no-global-assign`                        | Native rule; explicit effective options retained |
| `no-invalid-regexp`                                      | `eslint/no-invalid-regexp`                       | Native rule; explicit effective options retained |
| `no-irregular-whitespace`                                | `eslint/no-irregular-whitespace`                 | Native rule; explicit effective options retained |
| `no-loss-of-precision`                                   | `eslint/no-loss-of-precision`                    | Native rule; explicit effective options retained |
| `no-misleading-character-class`                          | `eslint/no-misleading-character-class`           | Native rule; explicit effective options retained |
| `no-nonoctal-decimal-escape`                             | `eslint/no-nonoctal-decimal-escape`              | Native rule; explicit effective options retained |
| `no-octal`                                               | `eslint/no-octal`                                | Strict-mode parser; invalid octal probe passed   |
| `no-regex-spaces`                                        | `eslint/no-regex-spaces`                         | Native rule; explicit effective options retained |
| `no-self-assign`                                         | `eslint/no-self-assign`                          | Native rule; explicit effective options retained |
| `no-shadow`                                              | `eslint/no-shadow`                               | Native rule; explicit effective options retained |
| `no-shadow-restricted-names`                             | `eslint/no-shadow-restricted-names`              | Native rule; explicit effective options retained |
| `no-sparse-arrays`                                       | `eslint/no-sparse-arrays`                        | Native rule; explicit effective options retained |
| `no-unsafe-finally`                                      | `eslint/no-unsafe-finally`                       | Native rule; explicit effective options retained |
| `no-unsafe-optional-chaining`                            | `eslint/no-unsafe-optional-chaining`             | Native rule; explicit effective options retained |
| `no-unused-labels`                                       | `eslint/no-unused-labels`                        | Native rule; explicit effective options retained |
| `no-unused-private-class-members`                        | `eslint/no-unused-private-class-members`         | Native rule; explicit effective options retained |
| `no-useless-backreference`                               | `eslint/no-useless-backreference`                | Native rule; explicit effective options retained |
| `no-useless-catch`                                       | `eslint/no-useless-catch`                        | Native rule; explicit effective options retained |
| `no-useless-escape`                                      | `eslint/no-useless-escape`                       | Native rule; explicit effective options retained |
| `no-var`                                                 | `eslint/no-var`                                  | Native rule; explicit effective options retained |
| `no-with`                                                | `eslint/no-with`                                 | Native rule; explicit effective options retained |
| `prefer-const`                                           | `eslint/prefer-const`                            | Native rule; explicit effective options retained |
| `require-yield`                                          | `eslint/require-yield`                           | Native rule; explicit effective options retained |
| `sort-imports`                                           | `eslint/sort-imports`                            | Native rule; explicit effective options retained |
| `use-isnan`                                              | `eslint/use-isnan`                               | Native rule; explicit effective options retained |
| `valid-typeof`                                           | `eslint/valid-typeof`                            | Native rule; explicit effective options retained |
| `@typescript-eslint/array-type`                          | `typescript/array-type`                          | Native rule; explicit effective options retained |
| `@typescript-eslint/ban-ts-comment`                      | `typescript/ban-ts-comment`                      | Native rule; explicit effective options retained |
| `@typescript-eslint/consistent-type-imports`             | `typescript/consistent-type-imports`             | Native rule; explicit effective options retained |
| `@typescript-eslint/method-signature-style`              | `typescript/method-signature-style`              | Native rule; explicit effective options retained |
| `@typescript-eslint/naming-convention`                   | `bcordes/type-parameter-name`                    | Custom syntax-only JS rule                       |
| `@typescript-eslint/no-duplicate-enum-values`            | `typescript/no-duplicate-enum-values`            | Native rule; explicit effective options retained |
| `@typescript-eslint/no-extra-non-null-assertion`         | `typescript/no-extra-non-null-assertion`         | Native rule; explicit effective options retained |
| `@typescript-eslint/no-for-in-array`                     | `typescript/no-for-in-array`                     | Native rule; explicit effective options retained |
| `@typescript-eslint/no-inferrable-types`                 | `typescript/no-inferrable-types`                 | Native rule; explicit effective options retained |
| `@typescript-eslint/no-misused-new`                      | `typescript/no-misused-new`                      | Native rule; explicit effective options retained |
| `@typescript-eslint/no-namespace`                        | `typescript/no-namespace`                        | Native rule; explicit effective options retained |
| `@typescript-eslint/no-non-null-asserted-optional-chain` | `typescript/no-non-null-asserted-optional-chain` | Native rule; explicit effective options retained |
| `@typescript-eslint/no-unnecessary-condition`            | `typescript/no-unnecessary-condition`            | Native rule; explicit effective options retained |
| `@typescript-eslint/no-unnecessary-type-assertion`       | `typescript/no-unnecessary-type-assertion`       | Native rule; explicit effective options retained |
| `@typescript-eslint/no-unsafe-function-type`             | `typescript/no-unsafe-function-type`             | Native rule; explicit effective options retained |
| `@typescript-eslint/no-wrapper-object-types`             | `typescript/no-wrapper-object-types`             | Native rule; explicit effective options retained |
| `@typescript-eslint/prefer-as-const`                     | `typescript/prefer-as-const`                     | Native rule; explicit effective options retained |
| `@typescript-eslint/prefer-for-of`                       | `typescript/prefer-for-of`                       | Native rule; explicit effective options retained |
| `@typescript-eslint/require-await`                       | `typescript/require-await`                       | Native rule; explicit effective options retained |
| `@typescript-eslint/triple-slash-reference`              | `typescript/triple-slash-reference`              | Native rule; explicit effective options retained |
| `import/consistent-type-specifier-style`                 | `import/consistent-type-specifier-style`         | Native rule; explicit effective options retained |
| `import/first`                                           | `import/first`                                   | Native rule; explicit effective options retained |
| `import/newline-after-import`                            | `import/newline-after-import`                    | Native rule; explicit effective options retained |
| `import/no-commonjs`                                     | `import/no-commonjs`                             | Native rule; explicit effective options retained |
| `import/no-duplicates`                                   | `import/no-duplicates`                           | Native rule; explicit effective options retained |
| `import/order`                                           | `import-js/order`                                | Upstream JS rule                                 |
| `node/prefer-node-protocol`                              | `unicorn/prefer-node-protocol`                   | Native rule; explicit effective options retained |
| `@stylistic/spaced-comment`                              | `style-js/spaced-comment`                        | Upstream JS rule                                 |
| `no-restricted-imports`                                  | `eslint/no-restricted-imports`                   | Native rule; explicit effective options retained |

## Migration-tool corrections

The migration tool skips `sort-imports` because it assumes formatter sorting;
Oxlint provides that native rule, so retain its member-sorting options directly.
`node/prefer-node-protocol` can map to the native Unicorn rule. The typed
`no-unnecessary-condition` rule requires explicit nursery inclusion. Preserve
its UI/forms exception and the two inline suppressions in health and UserMenu.

## Scope to preserve

Retain all generated/configuration ignores from the shared config and inherited
preset. Preserve the general deep-package restriction, headless auth-to-UI
restriction, removed tilde alias, app module entrypoint restrictions and
features/shared/app-to-routes restriction, including each diagnostic message.
No new exclusions or default-rule assumptions are permitted.

## Original decision point

To preserve all current rules without adopting alpha plugin support, keep a
small ESLint pass for the three gaps while Oxlint handles native checks. This
would defer complete ESLint removal. The alternative is explicit retirement of
these three style policies. Neither option has been applied.

References: [migration guide](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html),
[JS plugin status](https://oxc.rs/docs/guide/usage/linter/js-plugins.html).

## Native behavior probes

Oxlint 1.82.0 with oxlint-tsgolint 7.0.2001 was exercised in an isolated
temporary project, leaving the repository linter and compiler unchanged.
Seventeen files produced nine intended failures and eight clean results:

- Reject feature-to-route imports, deep app imports, deep package imports,
  auth-to-UI imports and the retired tilde alias; accept public module/package
  imports and UI imports from permitted packages.
- Reject an always-truthy typed condition in application code; preserve the
  UI/forms exceptions and an explicit inline typed-rule suppression.
- Reject bare Node builtins, unsorted named imports and legacy octal syntax;
  accept sorted named imports and valid optional-value handling.

The automatic migration's import patterns were insufficient: Oxlint's native
globs require a recursive final ** for nested paths. For example, migrate
`@bcordes/ui/*` to `@bcordes/ui/**`, `~/*` to `~/**`, and
`@/features/*/*` to `@/features/*/**`. With those changes, the probes match the
existing boundary policy. Keep each existing diagnostic message.

These probes establish the listed behavior, not complete equivalence of every
option. No policy has been retired. The subsequent authorized JS plugin trial is
documented below. At that probe stage, repository lint commands were unchanged.

## Authorized JS plugin trial

On September 7, the user requested trying Oxlint's JS plugin implementation.
Oxlint 1.82.0 loaded the existing plugins with explicit aliases, preserving the
three effective ESLint rule configurations:

| Plugin and rule                                                | Result                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@stylistic/eslint-plugin` 5.10.0, `spaced-comment`            | Reports `//bad`, accepts `// Good`, and fixes the missing space.                            |
| `eslint-plugin-import-x` 4.16.1, `order`                       | Reports a relative import before a Node builtin, accepts the reverse, and fixes the order.  |
| `@typescript-eslint/eslint-plugin` 8.57.1, `naming-convention` | Crashes during rule creation on both valid and invalid generic names.                       |
| `@typescript-eslint/eslint-plugin` 8.69.0, `naming-convention` | Same crash on a valid generic name, with supported TypeScript 6.0.3 in an isolated install. |

The naming configuration selects only type parameters, but the upstream rule
unconditionally calls `getParserServices(context, true)` during creation. Oxlint
cannot supply the required parser services. The failure occurs before checking
`TValue` or `Bad`, so this is not a naming diagnostic. Oxlint's documented lack
of type-aware JS plugin support applies; native type-aware linting does not
provide those ESLint parser services.

An isolated install of the latest naming plugin with TypeScript 7.0.2 also fails
peer dependency resolution: its parser requires TypeScript `>=4.8.4 <6.1.0`.
Using supported TypeScript 6.0.3 still reproduces the parser-services crash.
No peer constraints were bypassed and no workspace dependencies changed.

With the naming plugin removed from the probe, the invalid file produces exactly
the expected two diagnostics and the valid file is clean. Both autofixes apply,
and a second lint pass is clean. These are narrow behavior probes, not proof of
all import-group classification or comment-option edge cases.

At the end of that trial, ESLint remained active pending a choice between a
custom syntax-only generic naming plugin and retaining ESLint for the upstream
naming rule. The subsequent approval and implementation are recorded below. Trial configurations and fixtures stayed in ignored scratch/temporary
directories; no source-text tests were added.

## Adopted implementation

The user approved the custom naming rule after the upstream JS plugin trial.
`packages/config/oxlint-plugin.js` implements only the existing type-parameter
policy. The original ASCII regular expression already implies PascalCase and
forbids leading/trailing underscores. Its selector matches the upstream rule's
`TSTypeParameterDeclaration > TSTypeParameter`; inferred and mapped-type bindings
remain outside the policy. There is no automatic rename fix.

The real Oxlint CLI tests cover accepted/rejected names, functions, classes,
interfaces, arrows, generic methods, inferred/mapped names and inline suppression.
The workspace-config fixture additionally verifies all import-boundary classes,
public imports, typed-condition exceptions/suppression, comment spacing, import
ordering, member sorting and Node protocol. The earlier isolated probe covers
strict-mode octal rejection. Existing source-test edits only adapt the removed
ESLint configuration to Oxlint; no new source-text assertions were added.

All effective options from the representative baseline are explicit in the
native rule configuration, including 17 defaults omitted by the migration tool.
Generated/configuration ignores, global declarations and scoped restrictions are
retained. Recursive boundary patterns use the verified Oxlint glob equivalents.
The two application typed-rule comments now use Oxlint's rule names.

Root lint, app lint, lint-staged and therefore CI run Oxlint 1.82.0 with
oxlint-tsgolint 7.0.2001. Upstream JS rules use @stylistic/eslint-plugin 5.10.0 and
eslint-plugin-import-x 4.17.1. The latter was updated to its current stable version;
its unused optional typescript-eslint peer tree was removed by reinstalling that
plugin, resolving the stale TypeScript peer warnings without overrides. ESLint
remains solely as a plugin peer dependency; its CLI command, shared configuration
export and TanStack preset are removed.

Every workspace's standalone `tsc --noEmit` selects TypeScript 7.0.2. There is no
TypeScript 6 fallback. Removing app `baseUrl` retains the explicit relative `@/*`
path mapping. Native lint found six unnecessary casts; deleting them preserves
the same assignments and test behavior. Storybook still uses default react-docgen.

The obsolete root-config source assertion was removed. Two configuration-shape
boundary tests were replaced by the CLI fixture test, and the naming CLI test was
added. Existing architecture checks retain their assertions with Oxlint paths and
glob syntax. This changes the test count from 1,289 to 1,288 without removing any
application behavior check or changing coverage settings.
