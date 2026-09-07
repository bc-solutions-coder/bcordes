import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { conditions: ['browser'] },
  test: {
    environment: 'jsdom',
    server: { deps: { inline: [/@tanstack\/.*devtools/, /solid-js/] } },
    setupFiles: ['@bcordes/test-utils/setup'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
