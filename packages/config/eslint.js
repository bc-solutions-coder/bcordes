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
    files: ['apps/web/src/components/ui/**'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  // --- Module boundary rules ---
  //
  // Ordering matters. The broad blocks come first and the narrower layer
  // blocks come after them, each repeating the groups it still wants, because
  // the last matching block wins outright for a given rule.

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
        { patterns: [noDeepPackageImports, noTildeAlias] },
      ],
    },
  },

  // Components must not import from routes
  {
    files: ['apps/web/src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noDeepPackageImports,
            noTildeAlias,
            {
              group: ['@/routes/*'],
              message:
                'Components must not import from routes. Move shared logic to lib/ or hooks/.',
            },
          ],
        },
      ],
    },
  },

  // Hooks must not import components or routes
  {
    files: ['apps/web/src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noDeepPackageImports,
            noTildeAlias,
            {
              group: ['@/routes/*'],
              message: 'Hooks must not import from routes.',
            },
            {
              group: ['@/components/*'],
              message:
                'Hooks must not import components. Extract shared logic to a utility.',
            },
          ],
        },
      ],
    },
  },

  // Lib must not import from components, hooks, or routes
  {
    files: ['apps/web/src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noDeepPackageImports,
            noTildeAlias,
            {
              group: ['@/routes/*', '@/components/*', '@/hooks/*'],
              message:
                'lib/ is a low-level layer. It must not import from routes, components, or hooks.',
            },
          ],
        },
      ],
    },
  },
]

export default config
