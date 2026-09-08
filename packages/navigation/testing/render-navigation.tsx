import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

export function renderNavigation(content: ReactNode, path = '/projects') {
  const root = createRootRoute({
    component: () => (
      <>
        {content}
        <Outlet />
      </>
    ),
  })
  const routes = [
    '/projects',
    '/projects/alpha',
    '/about',
    '/docs',
    '/pricing',
    '/auth/login',
  ].map((to) =>
    createRoute({
      getParentRoute: () => root,
      path: to,
      component: () => <h1>{to} destination</h1>,
    }),
  )
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  return { ...render(<RouterProvider router={router} />), router }
}
