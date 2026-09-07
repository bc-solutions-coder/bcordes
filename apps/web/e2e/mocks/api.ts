import type { Page, Route } from '@playwright/test'

type RouteHandler = (route: Route) => Promise<void> | void

interface MockRouteDefinition {
  /** Playwright URL glob or RegExp. */
  pattern: string | RegExp
  handler: RouteHandler
}

export async function mockRoute(
  page: Page,
  pattern: string | RegExp,
  handler: RouteHandler,
): Promise<void> {
  await page.route(pattern, handler)
}

/** Intercepts browser requests; server calls use the [backend fixture](../README.md). */
export async function mockWallowApi(
  page: Page,
  routes: MockRouteDefinition[],
): Promise<void> {
  await Promise.all(
    routes.map(({ pattern, handler }) => mockRoute(page, pattern, handler)),
  )
}
