import { defineConfig, devices } from '@playwright/test'

// This config lives at the apps/web root so it is auto-discovered by
// `pnpm --filter bcordes exec playwright test` (cwd = apps/web). Without it,
// Playwright falls back to testDir=cwd + its default `**/*.@(spec|test)` glob,
// which matches the app's vitest `src/**/*.test.ts` files and blows up with a
// vitest-vs-@playwright/test `expect` matcher collision. Scoping testDir to
// ./e2e keeps the two runners' specs disjoint (vitest only collects `src/**`).
//
// Port is env-driven (E2E_PORT, default 3000) so the suite can boot on a free
// port when 3000 is occupied. reuseExistingServer is opt-out via E2E_NO_REUSE=1
// so a fresh dev server can be forced instead of silently reusing whatever
// already holds the port.
const PORT = Number(process.env.E2E_PORT ?? 3000)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  outputDir: './e2e/test-results',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `pnpm exec vite dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.E2E_NO_REUSE,
    timeout: 120_000,
  },
})
