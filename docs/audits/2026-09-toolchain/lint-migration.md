# Lint migration inventory, #57

This is a migration inventory, not a completed equivalence claim. ESLint remains
active until all required checks have a verified replacement or an explicit decision.

The installed ESLint configuration has 74 enabled rules on the representative
app, route, auth and query files; UI components and forms disable only
`no-unnecessary-condition`. Oxlint 1.82.0 native rule metadata identifies three
remaining gaps: type-parameter naming, spaced comments and import-group ordering.
Its JS plugin API is still alpha. The user approved trying that implementation;
the isolated results below show that two of the three rules work.

| Existing rule                                            | Candidate replacement                            | Status                                                       |
| -------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| `for-direction`                                          | `eslint/for-direction`                           | Native rule; option/fixture verification pending             |
| `no-async-promise-executor`                              | `eslint/no-async-promise-executor`               | Native rule; option/fixture verification pending             |
| `no-case-declarations`                                   | `eslint/no-case-declarations`                    | Native rule; option/fixture verification pending             |
| `no-class-assign`                                        | `eslint/no-class-assign`                         | Native rule; option/fixture verification pending             |
| `no-compare-neg-zero`                                    | `eslint/no-compare-neg-zero`                     | Native rule; option/fixture verification pending             |
| `no-cond-assign`                                         | `eslint/no-cond-assign`                          | Native rule; option/fixture verification pending             |
| `no-constant-binary-expression`                          | `eslint/no-constant-binary-expression`           | Native rule; option/fixture verification pending             |
| `no-constant-condition`                                  | `eslint/no-constant-condition`                   | Native rule; option/fixture verification pending             |
| `no-control-regex`                                       | `eslint/no-control-regex`                        | Native rule; option/fixture verification pending             |
| `no-debugger`                                            | `eslint/no-debugger`                             | Native rule; option/fixture verification pending             |
| `no-delete-var`                                          | `eslint/no-delete-var`                           | Native rule; option/fixture verification pending             |
| `no-dupe-else-if`                                        | `eslint/no-dupe-else-if`                         | Native rule; option/fixture verification pending             |
| `no-duplicate-case`                                      | `eslint/no-duplicate-case`                       | Native rule; option/fixture verification pending             |
| `no-empty-character-class`                               | `eslint/no-empty-character-class`                | Native rule; option/fixture verification pending             |
| `no-empty-pattern`                                       | `eslint/no-empty-pattern`                        | Native rule; option/fixture verification pending             |
| `no-empty-static-block`                                  | `eslint/no-empty-static-block`                   | Native rule; option/fixture verification pending             |
| `no-ex-assign`                                           | `eslint/no-ex-assign`                            | Native rule; option/fixture verification pending             |
| `no-extra-boolean-cast`                                  | `eslint/no-extra-boolean-cast`                   | Native rule; option/fixture verification pending             |
| `no-fallthrough`                                         | `eslint/no-fallthrough`                          | Native rule; option/fixture verification pending             |
| `no-global-assign`                                       | `eslint/no-global-assign`                        | Native rule; option/fixture verification pending             |
| `no-invalid-regexp`                                      | `eslint/no-invalid-regexp`                       | Native rule; option/fixture verification pending             |
| `no-irregular-whitespace`                                | `eslint/no-irregular-whitespace`                 | Native rule; option/fixture verification pending             |
| `no-loss-of-precision`                                   | `eslint/no-loss-of-precision`                    | Native rule; option/fixture verification pending             |
| `no-misleading-character-class`                          | `eslint/no-misleading-character-class`           | Native rule; option/fixture verification pending             |
| `no-nonoctal-decimal-escape`                             | `eslint/no-nonoctal-decimal-escape`              | Native rule; option/fixture verification pending             |
| `no-octal`                                               | `eslint/no-octal`                                | Strict-mode parser replacement; fixture verification pending |
| `no-regex-spaces`                                        | `eslint/no-regex-spaces`                         | Native rule; option/fixture verification pending             |
| `no-self-assign`                                         | `eslint/no-self-assign`                          | Native rule; option/fixture verification pending             |
| `no-shadow`                                              | `eslint/no-shadow`                               | Native rule; option/fixture verification pending             |
| `no-shadow-restricted-names`                             | `eslint/no-shadow-restricted-names`              | Native rule; option/fixture verification pending             |
| `no-sparse-arrays`                                       | `eslint/no-sparse-arrays`                        | Native rule; option/fixture verification pending             |
| `no-unsafe-finally`                                      | `eslint/no-unsafe-finally`                       | Native rule; option/fixture verification pending             |
| `no-unsafe-optional-chaining`                            | `eslint/no-unsafe-optional-chaining`             | Native rule; option/fixture verification pending             |
| `no-unused-labels`                                       | `eslint/no-unused-labels`                        | Native rule; option/fixture verification pending             |
| `no-unused-private-class-members`                        | `eslint/no-unused-private-class-members`         | Native rule; option/fixture verification pending             |
| `no-useless-backreference`                               | `eslint/no-useless-backreference`                | Native rule; option/fixture verification pending             |
| `no-useless-catch`                                       | `eslint/no-useless-catch`                        | Native rule; option/fixture verification pending             |
| `no-useless-escape`                                      | `eslint/no-useless-escape`                       | Native rule; option/fixture verification pending             |
| `no-var`                                                 | `eslint/no-var`                                  | Native rule; option/fixture verification pending             |
| `no-with`                                                | `eslint/no-with`                                 | Native rule; option/fixture verification pending             |
| `prefer-const`                                           | `eslint/prefer-const`                            | Native rule; option/fixture verification pending             |
| `require-yield`                                          | `eslint/require-yield`                           | Native rule; option/fixture verification pending             |
| `sort-imports`                                           | `eslint/sort-imports`                            | Native rule; option/fixture verification pending             |
| `use-isnan`                                              | `eslint/use-isnan`                               | Native rule; option/fixture verification pending             |
| `valid-typeof`                                           | `eslint/valid-typeof`                            | Native rule; option/fixture verification pending             |
| `@typescript-eslint/array-type`                          | `typescript/array-type`                          | Native rule; option/fixture verification pending             |
| `@typescript-eslint/ban-ts-comment`                      | `typescript/ban-ts-comment`                      | Native rule; option/fixture verification pending             |
| `@typescript-eslint/consistent-type-imports`             | `typescript/consistent-type-imports`             | Native rule; option/fixture verification pending             |
| `@typescript-eslint/method-signature-style`              | `typescript/method-signature-style`              | Native rule; option/fixture verification pending             |
| `@typescript-eslint/naming-convention`                   | `typescript/naming-convention`                   | GAP                                                          |
| `@typescript-eslint/no-duplicate-enum-values`            | `typescript/no-duplicate-enum-values`            | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-extra-non-null-assertion`         | `typescript/no-extra-non-null-assertion`         | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-for-in-array`                     | `typescript/no-for-in-array`                     | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-inferrable-types`                 | `typescript/no-inferrable-types`                 | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-misused-new`                      | `typescript/no-misused-new`                      | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-namespace`                        | `typescript/no-namespace`                        | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-non-null-asserted-optional-chain` | `typescript/no-non-null-asserted-optional-chain` | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-unnecessary-condition`            | `typescript/no-unnecessary-condition`            | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-unnecessary-type-assertion`       | `typescript/no-unnecessary-type-assertion`       | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-unsafe-function-type`             | `typescript/no-unsafe-function-type`             | Native rule; option/fixture verification pending             |
| `@typescript-eslint/no-wrapper-object-types`             | `typescript/no-wrapper-object-types`             | Native rule; option/fixture verification pending             |
| `@typescript-eslint/prefer-as-const`                     | `typescript/prefer-as-const`                     | Native rule; option/fixture verification pending             |
| `@typescript-eslint/prefer-for-of`                       | `typescript/prefer-for-of`                       | Native rule; option/fixture verification pending             |
| `@typescript-eslint/require-await`                       | `typescript/require-await`                       | Native rule; option/fixture verification pending             |
| `@typescript-eslint/triple-slash-reference`              | `typescript/triple-slash-reference`              | Native rule; option/fixture verification pending             |
| `import/consistent-type-specifier-style`                 | `import/consistent-type-specifier-style`         | Native rule; option/fixture verification pending             |
| `import/first`                                           | `import/first`                                   | Native rule; option/fixture verification pending             |
| `import/newline-after-import`                            | `import/newline-after-import`                    | Native rule; option/fixture verification pending             |
| `import/no-commonjs`                                     | `import/no-commonjs`                             | Native rule; option/fixture verification pending             |
| `import/no-duplicates`                                   | `import/no-duplicates`                           | Native rule; option/fixture verification pending             |
| `import/order`                                           | `import/order`                                   | GAP                                                          |
| `node/prefer-node-protocol`                              | `unicorn/prefer-node-protocol`                   | Native rule; option/fixture verification pending             |
| `@stylistic/spaced-comment`                              | `@stylistic/spaced-comment`                      | GAP                                                          |
| `no-restricted-imports`                                  | `eslint/no-restricted-imports`                   | Native rule; option/fixture verification pending             |

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
documented below; no repository lint command has been replaced yet.

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

The trial therefore does not yet replace ESLint. A custom syntax-only generic
naming plugin, or retaining ESLint for the upstream naming rule, needs a follow-up
decision. Trial configurations and fixtures stayed in ignored scratch/temporary
directories; no source-text tests were added.
