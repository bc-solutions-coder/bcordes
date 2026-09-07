import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Route } from './error'

beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function openError(reason?: string) {
  const root = createRootRoute()
  const route = createRoute({
    component: Route.options.component,
    validateSearch: Route.options.validateSearch,
    path: '/auth/error',
    getParentRoute: () => root,
  })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <h1>Home destination</h1>,
  })
  const contact = createRoute({
    getParentRoute: () => root,
    path: '/contact',
    component: () => <h1>Contact destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([route, home, contact]),
    history: createMemoryHistory({
      initialEntries: [
        `/auth/error${reason === undefined ? '' : `?reason=${reason}`}`,
      ],
    }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
}

it.each([
  ['auth_failed', 'Authentication Failed'],
  ['state_mismatch', 'Security Check Failed'],
  ['missing_params', 'Incomplete Response'],
  ['too_many_redirects', 'Too Many Redirects'],
  ['unrecognized', 'Something Went Wrong'],
  [undefined, 'Something Went Wrong'],
])(
  'explains sign-in failure %s and offers another login attempt',
  async (reason, title) => {
    await openError(reason)
    expect(await screen.findByRole('heading', { name: title })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Try Again' })).toHaveAttribute(
      'href',
      '/bff/login',
    )
  },
)

it('lets a customer leave the error page for home', async () => {
  await openError('auth_failed')
  fireEvent.click(await screen.findByRole('link', { name: 'Go Home' }))
  expect(
    await screen.findByRole('heading', { name: 'Home destination' }),
  ).toBeVisible()
})

it('lets a customer contact the site about a persistent sign-in problem', async () => {
  await openError('auth_failed')
  fireEvent.click(await screen.findByRole('link', { name: 'get in touch' }))
  expect(
    await screen.findByRole('heading', { name: 'Contact destination' }),
  ).toBeVisible()
})
