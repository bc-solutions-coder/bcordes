// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

// Later matching blocks replace rule options, so repeat every required pattern.
// See [module boundaries](../../docs/development.md).
const noTildeAlias = {
  group: ['~/*'],
  message: 'Use @/ instead of ~/. The ~/ alias has been removed.',
}

const noDeepPackageImports = {
  group: ['@bcordes/*/src/*'],
  message:
    "Import a package's declared export subpaths, not its internals (e.g. '@bcordes/config/eslint', never '@bcordes/config/src/...').",
}

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
      'apps/web/storybook-static/**',
      'apps/web/.nitro/**',
      'apps/web/.output/**',
      'apps/web/coverage/**',
      'apps/web/e2e/**',
      'apps/web/public/**',
      'eslint.config.js',
      'prettier.config.js',
      // These configs have no covering tsconfig for type-aware lint rules.
      'packages/config/eslint.js',
      'vitest.config.ts',
    ],
  },
  {
    // UI primitives retain runtime guards that static types consider redundant.
    files: ['packages/ui/src/components/**', 'packages/forms/src/**'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  {
    files: ['packages/**/*.{ts,tsx}', 'apps/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noDeepPackageImports] }],
    },
  },

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

  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [noDeepPackageImports, noTildeAlias, noDeepModuleImports] },
      ],
    },
  },

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
