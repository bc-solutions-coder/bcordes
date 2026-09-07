import { render } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { Provider, getContext } from '@bcordes/query'
import type { AnyRoute } from '@tanstack/react-router'

export async function renderFileRoute(route: AnyRoute, path: string) {
  const root = createRootRoute()
  const options = { ...route.options, getParentRoute: () => root, path }
  route.update(options)
  const context = getContext()
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [path] }),
    context,
    Wrap: ({ children }) => <Provider {...context}>{children}</Provider>,
  })
  await router.load()
  return { router, ...render(<RouterProvider router={router} />) }
}
