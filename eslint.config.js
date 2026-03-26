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
]
