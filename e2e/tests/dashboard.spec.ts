import { test, expect } from '@playwright/test'
// import { sealSessionId } from '../fixtures/auth'

/**
 * Dashboard E2E Tests (scaffold — all skipped)
 *
 * These tests exercise authenticated dashboard routes. They are skipped
 * because the test environment does not yet have:
 *
 *   1. A running backend (Wallow API) or a full mock layer for the
 *      authenticated endpoints the dashboard depends on.
 *   2. A seeded server-side session map entry — `sealSessionId()` produces
 *      a valid sealed cookie value, but the server must also hold the
 *      corresponding session data (user profile, tokens) in its in-memory
 *      session store for the cookie to be accepted.
 *   3. CI-level SESSION_SECRET env var wired into the Playwright config.
 *
 * To enable these tests:
 *   - Set SESSION_SECRET in the Playwright env (min 32 chars, matching the
 *     running server).
 *   - Pre-seed a session entry on the server (e.g. via a test-only API
 *     route or by importing the session store directly in a global setup).
 *   - Call `sealSessionId(sessionId)` to produce the `__session` cookie
 *     value, then inject it via `page.context().addCookies(...)` before
 *     navigating to any /dashboard/* route.
 *   - Mock or provide the Wallow API responses the dashboard pages fetch.
 */

const SESSION_COOKIE_NAME = '__session'

test.describe('Dashboard (authenticated)', () => {
  /*
   * Intended beforeEach setup (once tests are enabled):
   *
   *   const sessionId = '<pre-seeded-session-id>'
   *   const sealed = await sealSessionId(sessionId)
   *   await page.context().addCookies([
   *     {
   *       name: SESSION_COOKIE_NAME,
   *       value: sealed,
   *       domain: 'localhost',
   *       path: '/',
   *     },
   *   ])
   */

  test.skip(
    'authenticated user with sealed session cookie lands on dashboard without redirect',
    async ({ page }) => {
      // Navigate to a dashboard sub-route (inquiries is the primary view)
      const response = await page.goto('/dashboard/inquiries')

      // Should NOT redirect to /auth/login — status should be 200
      expect(response?.status()).toBe(200)
      expect(page.url()).toContain('/dashboard/inquiries')
    },
  )

  test.skip(
    'dashboard layout and key widgets render',
    async ({ page }) => {
      await page.goto('/dashboard/inquiries')

      // The dashboard layout should contain navigation to its sub-sections
      await expect(
        page.getByRole('link', { name: /inquiries/i }),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: /notifications/i }),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: /settings/i }),
      ).toBeVisible()
    },
  )

  test.skip(
    'protected API routes receive the auth token forwarded from the session',
    async ({ page }) => {
      // Intercept an outbound API call the dashboard makes to the Wallow
      // backend and assert the Authorization header is present.
      const apiRequestPromise = page.waitForRequest((req) =>
        req.url().includes('/api/'),
      )

      await page.goto('/dashboard/inquiries')

      const apiRequest = await apiRequestPromise
      const authHeader = apiRequest.headers()['authorization']
      expect(authHeader).toBeTruthy()
      expect(authHeader).toMatch(/^Bearer\s+.+/)
    },
  )
})
