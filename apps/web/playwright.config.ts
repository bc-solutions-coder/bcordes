import { defineConfig, devices } from '@playwright/test'

// Build first: browser checks run the same Node artifact deployed to production.
// The fixture backend and Valkey occupy the next two ports unless overridden.
const PORT = Number(process.env.E2E_PORT ?? 3000)
process.env.COOKIE_PASSWORD = 'e2e-only-session-secret-at-least-32-characters'
process.env.E2E_BACKEND_PORT ??= String(PORT + 1)
process.env.E2E_VALKEY_PORT ??= String(PORT + 2)
process.env.REDIS_URL =
  process.env.E2E_VALKEY_URL ??
  `redis://127.0.0.1:${process.env.E2E_VALKEY_PORT}`
process.env.BFF_API_BASE_URL = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}`
process.env.OIDC_ISSUER = process.env.BFF_API_BASE_URL
process.env.OIDC_CLIENT_ID = 'e2e-browser'
process.env.OIDC_CLIENT_SECRET = 'e2e-client-secret'
process.env.OIDC_REDIRECT_URI = `http://localhost:${PORT}/bff/callback`
const baseURL = `http://localhost:${PORT}`

process.env.OIDC_POST_LOGOUT_REDIRECT_URI = `http://localhost:${PORT}/`
process.env.COOKIE_SECURE = 'true'
process.env.COOKIE_NAME = 'wallow_bff_e2e'
process.env.BFF_APP_ID = 'bcordes-e2e'
process.env.OIDC_SERVICE_SCOPES = 'inquiries.write'
process.env.OIDC_SERVICE_CLIENT_ID = 'e2e-service'
process.env.OIDC_SERVICE_CLIENT_SECRET = 'e2e-service-secret'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/fixtures/setup.ts',
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
    command: 'node .output/server/index.mjs',
    env: { PORT: String(PORT), HOST: '127.0.0.1', NODE_ENV: 'production' },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
