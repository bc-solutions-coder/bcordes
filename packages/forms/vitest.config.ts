import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // NOT the environment: 'node' of the leaf packages (utils/logger/valkey).
    // The form primitive and SelectFormField both render, and SelectFormField
    // drives a Base UI Select, so this project needs a DOM plus the three jsdom
    // polyfills that Select's listbox/overlay behaviour depends on.
    environment: 'jsdom',
    setupFiles: ['@bcordes/test-utils/setup'],
    include: ['*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
