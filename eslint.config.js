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

export default [
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
  // Ordering matters. The broad ~/ block comes first and the narrower layer
  // blocks come after it, each repeating noTildeAlias, because the last
  // matching block wins outright for a given rule.

  // Block the removed ~/ alias everywhere
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noTildeAlias] }],
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
