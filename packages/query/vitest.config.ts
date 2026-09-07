import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['@bcordes/test-utils/setup'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
