import { expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import {
  RouterProvider,
  createMemoryHistory,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Provider, getContext } from '@bcordes/query'
import { Route } from './__root'

vi.mock('@/shared/auth', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}))

async function documentOutput() {
  const context = getContext()
  const home = createRoute({
    getParentRoute: () => Route,
    path: '/',
    component: () => <h1>Requested page content</h1>,
  })
  const router = createRouter({
    routeTree: Route.addChildren([home]),
    isServer: true,
    context,
    history: createMemoryHistory({ initialEntries: ['/'] }),
    Wrap: ({ children }) => <Provider {...context}>{children}</Provider>,
  })
  await router.load()
  return new DOMParser().parseFromString(
    renderToString(<RouterProvider router={router} />),
    'text/html',
  )
}

it('generates the site title, description, canonical URL and identity metadata', async () => {
  const output = await documentOutput()
  expect(output.title).toBe('BC Solutions | Professional Software Engineering')
  expect(
    output.querySelector('meta[name="description"]')?.getAttribute('content'),
  ).toBe(
    'Bryan Cordes - Professional software engineering solutions. Full-stack development, technical consulting, and architecture expertise for startups and enterprises.',
  )
  expect(
    output.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  ).toBe('https://bcordes.dev')
  const identity: unknown = JSON.parse(
    output.querySelector('script[type="application/ld+json"]')?.textContent ??
      'null',
  )
  expect(identity).toMatchObject({
    '@type': 'Person',
    name: 'Bryan Cordes',
    url: 'https://bcordes.dev',
  })
})

it('serves page content with named header and footer navigation and a sign-in destination', async () => {
  const output = await documentOutput()
  expect(output.querySelector('main')?.textContent).toContain(
    'Requested page content',
  )
  for (const landmark of ['header', 'footer']) {
    const links = [
      ...(output.querySelector(landmark)?.querySelectorAll('a') ?? []),
    ]
    expect(
      links
        .find((link) => link.textContent === 'Projects')
        ?.getAttribute('href'),
    ).toBe('/projects')
  }
  const links = [...output.querySelectorAll('header a')]
  expect(
    links.find((link) => link.textContent === 'Sign In')?.getAttribute('href'),
  ).toBe('/bff/login')
})
