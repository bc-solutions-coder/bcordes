import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // NOT the environment: 'node' of the leaf packages (utils/logger/valkey).
    // The MainNav/MobileNav shells render React (and MobileNav drives a Base UI
    // Sheet/Dialog), so this project needs a DOM plus the jsdom polyfills that
    // the overlay/listbox behaviour depends on. Mirrors packages/forms.
    environment: 'jsdom',
    setupFiles: ['@bcordes/test-utils/setup'],
    include: ['*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
