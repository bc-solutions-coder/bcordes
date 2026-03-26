import type { Page, Route } from '@playwright/test'

type RouteHandler = (route: Route) => Promise<void> | void

interface MockRouteDefinition {
  /** URL pattern (string glob or RegExp) */
  pattern: string | RegExp
  /** Handler called for each matched request */
  handler: RouteHandler
}

/**
 * Intercept a single network request pattern using `page.route()`.
 */
export async function mockRoute(
  page: Page,
  pattern: string | RegExp,
  handler: RouteHandler,
): Promise<void> {
  await page.route(pattern, handler)
}

/**
 * Register multiple mock routes at once, typically for the Wallow backend API.
 *
 * @example
 * ```ts
 * await mockWallowApi(page, [
 *   {
 *     pattern: '**/api/projects*',
 *     handler: (route) =>
 *       route.fulfill({ json: { items: [] }, status: 200 }),
 *   },
 * ])
 * ```
 */
export async function mockWallowApi(
  page: Page,
  routes: MockRouteDefinition[],
): Promise<void> {
  await Promise.all(
    routes.map(({ pattern, handler }) => mockRoute(page, pattern, handler)),
  )
}
