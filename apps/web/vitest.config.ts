import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['@bcordes/test-utils/setup'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
