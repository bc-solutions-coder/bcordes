//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

// The ~/ alias was removed; every file under the app's src/ must reject it.
// Flat config replaces (does not merge) rule options, so any block that
// re-declares no-restricted-imports for a subset of these files has to carry
// this group too, or it silently drops out for those files.
const noTildeAlias = {
  group: ['~/*'],
  message: 'Use @/ instead of ~/. The ~/ alias has been removed.',
}

// Workspace packages are consumed only through the export subpaths they
// declare in their package.json. Reaching past that into a package's source
// tree bypasses its public surface. Carried by every no-restricted-imports
// block for the same replace-not-merge reason as noTildeAlias.
const noDeepPackageImports = {
  group: ['@bcordes/*/src/*'],
  message:
    "Import a package's declared export subpaths, not its internals (e.g. '@bcordes/config/eslint', never '@bcordes/config/src/...').",
}

// Feature/shared modules under apps/web/src expose a public API via their own
// index.ts; cross-module imports must target the bare module
// (@/features/notifications, @/shared/auth), never reach into its internals.
// Intra-module imports use relative paths, which this pattern does not match.
// Carried by every app-scoped no-restricted-imports block for the same
// replace-not-merge reason as noTildeAlias/noDeepPackageImports: flat ESLint
// config replaces (does not merge) rule options, so the last matching block for
// a given files glob wins outright and must repeat every group it wants.
const noDeepModuleImports = {
  group: ['@/features/*/*', '@/shared/*/*', '@/app/*/*'],
  message:
    'Import a feature/shared module through its index (e.g. @/features/notifications), not its internals.',
}

/** @type {import('eslint').Linter.Config[]} */
export const config = [
  ...tanstackConfig,
  {
    ignores: [
      '.scratch',
      '.scratch/**',
      '.nitro/**',
      '.output/**',
      'coverage/**',
      'apps/web/.storybook/**',
      'apps/web/.nitro/**',
      'apps/web/.output/**',
      'apps/web/coverage/**',
      'apps/web/e2e/**',
      'apps/web/public/**',
      'eslint.config.js',
      'prettier.config.js',
      // A plain .js file that no tsconfig include covers, so the type-aware
      // rules cannot parse it — same reason as the two entries above.
      'packages/config/eslint.js',
      // No tsconfig at the workspace root to type it against; T1.4 relocates
      // this under apps/web, at which point it can be linted again.
      'vitest.config.ts',
    ],
  },
  {
    // The shadcn/Base UI primitives carry defensive conditions the type-aware
    // rule flags as always-truthy/falsy. The form primitive (extracted into
    // @bcordes/forms) is one of them, so it gets the same treatment.
    files: ['packages/ui/src/components/**', 'packages/forms/src/**'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  // --- Module boundary rules ---
  //
  // Ordering matters. The broad blocks come first and the narrower layer
  // blocks come after them, each repeating the groups it still wants, because
  // the last matching block wins outright for a given rule.
  //
  // The apps/web/src/{components,hooks,lib}/ layer blocks were retired along
  // with the horizontal dirs they governed: the app flattened into features/,
  // shared/ and app/, so those globs matched zero files. Their intent survives
  // — the features/shared/app block below still denies importing from
  // @/routes/*, and noDeepModuleImports denies reaching into any module's
  // internals, which is what the old cross-layer denials amounted to.

  // Every workspace package and app: no reaching into package internals.
  {
    files: ['packages/**/*.{ts,tsx}', 'apps/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noDeepPackageImports] }],
    },
  },

  // @bcordes/auth is a headless layer; it must not pull in the UI package.
  {
    files: ['packages/auth/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noDeepPackageImports,
            {
              group: ['@bcordes/ui', '@bcordes/ui/*'],
              message:
                'auth must not import ui. Auth is headless; keep presentation in the app or in ui.',
            },
          ],
        },
      ],
    },
  },

  // Block the removed ~/ alias everywhere in the app
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [noDeepPackageImports, noTildeAlias, noDeepModuleImports] },
      ],
    },
  },

  // features/shared are consumed BY routes and the app shell; they must never
  // depend on routes.
  {
    files: [
      'apps/web/src/features/**/*.{ts,tsx}',
      'apps/web/src/shared/**/*.{ts,tsx}',
      'apps/web/src/app/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noDeepPackageImports,
            noTildeAlias,
            noDeepModuleImports,
            {
              group: ['@/routes/*'],
              message:
                'Features/shared must not import from routes. Routes import features, not the reverse.',
            },
          ],
        },
      ],
    },
  },
]

export default config
