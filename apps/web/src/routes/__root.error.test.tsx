import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Route } from './__root'

beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function failingRoute(error: unknown) {
  let broken = true
  const root = createRootRoute({ errorComponent: Route.options.errorComponent })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <h1>Home destination</h1>,
  })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/broken',
    component: () => {
      if (broken) throw error
      return <h1>Recovered page</h1>
    },
  })
  const router = createRouter({
    routeTree: root.addChildren([home, page]),
    history: createMemoryHistory({ initialEntries: ['/broken'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  return () => {
    broken = false
  }
}

it('recovers a transient render failure when the customer tries again', async () => {
  const recover = await failingRoute(new Error('temporary render failure'))
  expect(await screen.findByText('Something Went Wrong')).toBeVisible()
  recover()
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
  expect(
    await screen.findByRole('heading', { name: 'Recovered page' }),
  ).toBeVisible()
})

it('offers home navigation when the thrown value is not an Error', async () => {
  await failingRoute('failed render')
  expect(await screen.findByText('Something Went Wrong')).toBeVisible()
  fireEvent.click(screen.getByRole('link', { name: 'Go Home' }))
  expect(
    await screen.findByRole('heading', { name: 'Home destination' }),
  ).toBeVisible()
})

it('shows the thrown Error message in development', async () => {
  vi.stubEnv('DEV', true)
  await failingRoute(new Error('Development diagnostic fixture'))
  expect(
    await screen.findByText('Development diagnostic fixture'),
  ).toBeVisible()
})

it('keeps production errors generic and allows home navigation', async () => {
  vi.stubEnv('DEV', false)
  await failingRoute(new Error('Private diagnostic fixture'))
  expect(
    await screen.findByText('An unexpected error occurred. Please try again.'),
  ).toBeVisible()
  expect(
    screen.queryByText('Private diagnostic fixture'),
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('link', { name: 'Go Home' }))
  expect(
    await screen.findByRole('heading', { name: 'Home destination' }),
  ).toBeVisible()
})
