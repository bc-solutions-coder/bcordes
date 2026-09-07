import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'

const { loadDestination } = vi.hoisted(() => ({
  loadDestination: vi.fn(() => 'Loaded project'),
}))
vi.mock('./routeTree.gen', async () => {
  const { createRootRoute, createRoute, Link } =
    await import('@tanstack/react-router')
  const root = createRootRoute()
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <Link to="/projects">Projects</Link>,
  })
  const destination = createRoute({
    getParentRoute: () => root,
    path: '/projects',
    loader: loadDestination,
    component: () => <h1>{destination.useLoaderData()}</h1>,
  })
  return { routeTree: root.addChildren([home, destination]) }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

it('loads the selected route and renders its loader result', async () => {
  const { getRouter } = await import('./router')
  const router = getRouter()
  router.update({
    context: router.options.context,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('link', { name: 'Projects' }))
  expect(
    await screen.findByRole('heading', { name: 'Loaded project' }),
  ).toBeVisible()
  expect(router.state.location.pathname).toBe('/projects')
})

it('loads the destination on link intent before navigation', async () => {
  const { getRouter } = await import('./router')
  const router = getRouter()
  router.update({
    context: router.options.context,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  const link = await screen.findByRole('link', { name: 'Projects' })
  expect(loadDestination).not.toHaveBeenCalled()
  fireEvent.mouseEnter(link)
  await waitFor(() => expect(loadDestination).toHaveBeenCalledOnce())
  expect(router.state.location.pathname).toBe('/')
  fireEvent.click(link)
  expect(
    await screen.findByRole('heading', { name: 'Loaded project' }),
  ).toBeVisible()
})

it('isolates query data between independently created routers', async () => {
  const { getRouter } = await import('./router')
  const first = getRouter()
  const second = getRouter()
  first.options.context.queryClient.setQueryData(['customer'], 'First customer')
  expect(
    second.options.context.queryClient.getQueryData(['customer']),
  ).toBeUndefined()
  second.options.context.queryClient.setQueryData(
    ['customer'],
    'Second customer',
  )
  expect(first.options.context.queryClient.getQueryData(['customer'])).toBe(
    'First customer',
  )
  expect(second.options.context.queryClient.getQueryData(['customer'])).toBe(
    'Second customer',
  )
})
