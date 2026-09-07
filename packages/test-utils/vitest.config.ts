import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',

    // Use a relative path to load setup without resolving this package through itself.
    setupFiles: ['./src/setup.ts'],
    include: ['*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
