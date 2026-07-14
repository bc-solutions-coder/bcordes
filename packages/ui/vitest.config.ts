import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // NOT the environment: 'node' of the other leaf packages (utils/logger/
    // valkey). Every primitive here renders, so this project needs a DOM and
    // the three jsdom polyfills Base UI's overlays and Select depend on.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
