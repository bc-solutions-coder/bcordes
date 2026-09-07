import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Provider, getContext } from '@bcordes/query'
import { Route } from './__root'

vi.mock('@/shared/auth', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}))
vi.mock('@tanstack/react-devtools', () => ({
  TanStackDevtools: ({ plugins }: { plugins: Array<{ name: string }> }) => (
    <nav aria-label="Developer tools">
      {plugins.map((plugin) => (
        <button key={plugin.name}>{plugin.name}</button>
      ))}
    </nav>
  ),
}))
vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtoolsPanel: () => null,
}))

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function missingPage() {
  const root = createRootRoute({
    notFoundComponent: Route.options.notFoundComponent,
  })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <h1>Home destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([home]),
    history: createMemoryHistory({ initialEntries: ['/missing'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
}

it('explains that an unknown page was not found', async () => {
  await missingPage()
  expect(await screen.findByRole('heading', { name: '404' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeVisible()
  expect(
    screen.getByText(
      /The page you're looking for doesn't exist or has been moved/,
    ),
  ).toBeVisible()
})

it('returns home from an unknown page', async () => {
  await missingPage()
  fireEvent.click(await screen.findByRole('link', { name: 'Go Home' }))
  expect(
    await screen.findByRole('heading', { name: 'Home destination' }),
  ).toBeVisible()
})

it('offers the named router and query inspectors from the development shell', async () => {
  vi.stubEnv('DEV', true)
  const context = getContext()
  const home = createRoute({
    getParentRoute: () => Route,
    path: '/',
    component: () => <h1>Page content</h1>,
  })
  const router = createRouter({
    routeTree: Route.addChildren([home]),
    context,
    history: createMemoryHistory({ initialEntries: ['/'] }),
    Wrap: ({ children }) => <Provider {...context}>{children}</Provider>,
  })
  await router.load()
  render(<RouterProvider router={router} />)
  expect(
    await screen.findByRole('button', { name: 'Tanstack Router' }),
  ).toBeVisible()
  expect(
    await screen.findByRole('button', { name: 'Tanstack Query' }),
  ).toBeVisible()
})
