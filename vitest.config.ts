import { defineConfig } from 'vitest/config'

process.env.SESSION_SECRET = 'unit-test-session-secret-at-least-32-characters'

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 90, statements: 90, branches: 90, functions: 90 },
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
