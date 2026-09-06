import { afterEach, assert, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const { capturedHead, capturedShell } = vi.hoisted(() => {
  const shell: {
    component: React.ComponentType<{ children: React.ReactNode }> | undefined
  } = { component: undefined }
  return { capturedHead: vi.fn<() => unknown>(), capturedShell: shell }
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  createRootRouteWithContext:
    () =>
    (config: {
      head: () => unknown
      shellComponent: React.ComponentType<{ children: React.ReactNode }>
    }) => {
      capturedHead.mockImplementation(config.head)
      capturedShell.component = config.shellComponent
      return { options: config }
    },
  HeadContent: () => null,
  Scripts: () => null,
  Outlet: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="outlet">{children}</div>
  ),
  ScrollRestoration: () => null,
}))

vi.mock('@/app', () => ({
  Header: () => <div data-testid="header">Header</div>,
  Footer: () => <div data-testid="footer">Footer</div>,
  reportWebVitals: () => {},
}))

vi.mock('@bcordes/ui/components/sonner', () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}))

vi.mock('@/app/styles.css?url', () => ({ default: 'styles.css' }))

vi.mock('@/shared/auth', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}))

describe('__root route', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Route config', () => {
    it('exports a route config with notFoundComponent and head', async () => {
      const mod = await import('./__root')
      expect(mod.Route).toBeDefined()
      expect(mod.Route.options).toHaveProperty('notFoundComponent')
      expect(mod.Route.options).toHaveProperty('head')
      expect(mod.Route.options).toHaveProperty('shellComponent')
    })

    it('head returns correct meta and links', async () => {
      await import('./__root')
      const headResult = capturedHead()
      expect(headResult).toHaveProperty('meta')
      expect(headResult).toHaveProperty('links')
      expect(headResult).toHaveProperty('scripts')
    })
  })

  describe('NotFound component', () => {
    it('renders 404 heading', async () => {
      const mod = await import('./__root')
      const NotFound = mod.Route.options.notFoundComponent
      assert(NotFound)
      render(<NotFound isNotFound routeId="__root__" />)
      expect(screen.getByText('404')).toBeTruthy()
    })

    it('renders Page Not Found message', async () => {
      const mod = await import('./__root')
      const NotFound = mod.Route.options.notFoundComponent
      assert(NotFound)
      render(<NotFound isNotFound routeId="__root__" />)
      expect(screen.getByText('Page Not Found')).toBeTruthy()
    })

    it('renders description text', async () => {
      const mod = await import('./__root')
      const NotFound = mod.Route.options.notFoundComponent
      assert(NotFound)
      render(<NotFound isNotFound routeId="__root__" />)
      expect(
        screen.getByText(
          /The page you're looking for doesn't exist or has been moved/,
        ),
      ).toBeTruthy()
    })

    it('renders a Go Home link pointing to /', async () => {
      const mod = await import('./__root')
      const NotFound = mod.Route.options.notFoundComponent
      assert(NotFound)
      render(<NotFound isNotFound routeId="__root__" />)
      const link = screen.getByText('Go Home')
      expect(link.closest('a')?.getAttribute('href')).toBe('/')
    })
  })

  describe('RootDocument (shellComponent)', () => {
    it('renders Header, Footer, children, and Toaster', async () => {
      await import('./__root')
      const RootDocument = capturedShell.component
      assert(RootDocument)
      render(
        <RootDocument>
          <div data-testid="child-content">Page content</div>
        </RootDocument>,
      )
      expect(screen.getByTestId('header')).toBeTruthy()
      expect(screen.getByTestId('footer')).toBeTruthy()
      expect(screen.getByTestId('toaster')).toBeTruthy()
      expect(screen.getByTestId('child-content')).toBeTruthy()
    })
  })

  describe('DevTools component', () => {
    it('renders devtools panel after dynamic imports resolve', async () => {
      // Mock the dynamic imports that DevTools loads. The panel renders the
      // names of the plugins it was handed, so the assertion below can prove
      // the query plugin came from the mocked module and not from somewhere
      // else — i.e. that DevTools really loads it from '@bcordes/query/devtools'.
      const mockTanStackDevtools = ({
        children,
        plugins,
      }: {
        children?: React.ReactNode
        config?: unknown
        plugins?: Array<{ name: string }>
      }) => (
        <div data-testid="tanstack-devtools">
          <ul data-testid="devtools-plugin-names">
            {plugins?.map((plugin) => (
              <li key={plugin.name}>{plugin.name}</li>
            ))}
          </ul>
          {children}
        </div>
      )
      const mockRouterDevtoolsPanel = () => (
        <div data-testid="router-devtools-panel" />
      )
      const mockQueryPlugin = {
        name: 'Query From Package Subpath',
        render: <div />,
      }

      vi.doMock('@tanstack/react-devtools', () => ({
        TanStackDevtools: mockTanStackDevtools,
      }))
      vi.doMock('@tanstack/react-router-devtools', () => ({
        TanStackRouterDevtoolsPanel: mockRouterDevtoolsPanel,
      }))
      vi.doMock('@bcordes/query/devtools', () => ({
        default: mockQueryPlugin,
      }))

      // Re-import to pick up the mocked dynamic imports
      vi.resetModules()

      // Re-mock the static dependencies after resetModules
      vi.doMock('@tanstack/react-router', () => ({
        Link: ({
          to,
          children,
          ...rest
        }: {
          to: string
          children: React.ReactNode
          [key: string]: unknown
        }) => (
          <a href={to} {...rest}>
            {children}
          </a>
        ),
        createRootRouteWithContext:
          () =>
          (config: {
            head: () => unknown
            shellComponent: React.ComponentType<{ children: React.ReactNode }>
          }) => {
            capturedHead.mockImplementation(config.head)
            capturedShell.component = config.shellComponent
            return { options: config }
          },
        HeadContent: () => null,
        Scripts: () => null,
        Outlet: ({ children }: { children?: React.ReactNode }) => (
          <div data-testid="outlet">{children}</div>
        ),
        ScrollRestoration: () => null,
      }))
      vi.doMock('@/app', () => ({
        Header: () => <div data-testid="header">Header</div>,
        Footer: () => <div data-testid="footer">Footer</div>,
        reportWebVitals: () => {},
      }))
      vi.doMock('@bcordes/ui/components/sonner', () => ({
        Toaster: () => <div data-testid="toaster">Toaster</div>,
      }))
      vi.doMock('@/app/styles.css?url', () => ({ default: 'styles.css' }))
      vi.doMock('@/shared/auth', () => ({
        useUser: () => ({ user: null, isLoading: false }),
      }))

      await import('./__root')
      const RootDocument = capturedShell.component
      assert(RootDocument)

      const originalDev = import.meta.env.DEV
      import.meta.env.DEV = true

      const { findByTestId } = render(
        <RootDocument>
          <div>Content</div>
        </RootDocument>,
      )

      // Wait for the dynamic imports to resolve and setPanel to be called
      const devtools = await findByTestId('tanstack-devtools')
      expect(devtools).toBeTruthy()

      // The query devtools plugin must come from the '@bcordes/query/devtools'
      // subpath — the one mocked above — so it stays lazily loaded.
      expect(await findByTestId('devtools-plugin-names')).toHaveTextContent(
        'Query From Package Subpath',
      )

      import.meta.env.DEV = originalDev
    })
  })
})
