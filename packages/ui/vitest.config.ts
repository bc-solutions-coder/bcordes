import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Base UI components need a DOM and the shared browser API polyfills.
    environment: 'jsdom',
    setupFiles: ['@bcordes/test-utils/setup'],
    include: ['*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
