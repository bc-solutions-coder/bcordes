import { defineConfig } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  resolve: {
    alias: {
      h3: resolve(
        './node_modules/.pnpm/h3@2.0.1-rc.16_crossws@0.4.4_srvx@0.8.16_/node_modules/h3',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
