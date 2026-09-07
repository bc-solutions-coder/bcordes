import { render } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Provider, getContext } from '@bcordes/query'
import type { ReactNode } from 'react'

export async function renderRoute(content: ReactNode) {
  const root = createRootRoute()
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => content,
  })
  const destination = createRoute({
    getParentRoute: () => root,
    path: '$',
    component: () => <h1>Selected destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([home, destination]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return {
    router,
    ...render(
      <Provider {...getContext()}>
        <RouterProvider router={router} />
      </Provider>,
    ),
  }
}
