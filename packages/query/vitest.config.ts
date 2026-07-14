import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // NOT the environment: 'node' of the leaf packages (utils/logger/valkey).
    // The Provider renders and the devtools plugin holds a React element, so
    // this project needs a DOM.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
