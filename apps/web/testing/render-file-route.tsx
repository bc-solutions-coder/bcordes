import { render } from '@testing-library/react'
import {
  HeadContent,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { Provider, getContext } from '@bcordes/query'
import type { AnyRoute } from '@tanstack/react-router'

export async function renderFileRoute(
  route: AnyRoute,
  path: string,
  {
    initialPath = path,
    siblings = [],
  }: {
    initialPath?: string
    siblings?: Array<{ route: AnyRoute; path: string }>
  } = {},
) {
  const root = createRootRoute({
    component: () => (
      <>
        <HeadContent />
        <Outlet />
      </>
    ),
  })
  const options = { ...route.options, getParentRoute: () => root, path }
  route.update(options)
  const otherRoutes = siblings.map(({ route: sibling, path: siblingPath }) => {
    const siblingOptions = {
      ...sibling.options,
      getParentRoute: () => root,
      path: siblingPath,
    }
    return sibling.update(siblingOptions)
  })
  const context = getContext()
  const router = createRouter({
    routeTree: root.addChildren([route, ...otherRoutes]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    context,
    Wrap: ({ children }) => <Provider {...context}>{children}</Provider>,
  })
  await router.load()
  return { router, ...render(<RouterProvider router={router} />) }
}
