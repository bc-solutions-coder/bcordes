import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      include: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.stories.{ts,tsx}',
        '**/routeTree.gen.ts',
        '**/types.ts',
        'packages/ui/src/components/**',
      ],
    },
  },
})
