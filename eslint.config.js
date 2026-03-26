//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: [
      '.storybook/**',
      '.nitro/**',
      '.output/**',
      'coverage/**',
      'e2e/**',
      'public/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
  {
    files: ['src/components/ui/**'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  // --- Module boundary rules ---

  // Components must not import from routes
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
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
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
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
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
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

  // Block the removed ~/ alias everywhere
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['~/*'],
              message: 'Use @/ instead of ~/. The ~/ alias has been removed.',
            },
          ],
        },
      ],
    },
  },
]
