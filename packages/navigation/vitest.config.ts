import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['@bcordes/test-utils/setup'],
    include: ['*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
