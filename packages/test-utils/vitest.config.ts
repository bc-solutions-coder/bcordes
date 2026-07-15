import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // NOT the environment: 'node' of the leaf packages (utils/logger/valkey).
    // The render helper mounts React through the provider tree, so this project
    // needs a DOM. Mirrors packages/query.
    environment: 'jsdom',
    // Own LOCAL relative copy — never a self-import through the package's own
    // name — so the harness does not have to resolve itself to bootstrap.
    setupFiles: ['./src/setup.ts'],
    include: ['*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
