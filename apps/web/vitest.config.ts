import { defineConfig } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['@bcordes/test-utils/setup'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
