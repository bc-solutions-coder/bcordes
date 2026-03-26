import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

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
  createRootRouteWithContext: () => (config: unknown) => config,
  HeadContent: () => null,
  Scripts: () => null,
  Outlet: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="outlet">{children}</div>
  ),
  ScrollRestoration: () => null,
}))

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

vi.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))

vi.mock('@/components/ui/shadcn/sonner', () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}))

vi.mock('@/styles.css?url', () => ({ default: 'styles.css' }))

describe('__root route', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Route config', () => {
    it('exports a route config with notFoundComponent and head', async () => {
      const mod = await import('./__root')
      expect(mod.Route).toBeDefined()
      expect(mod.Route).toHaveProperty('notFoundComponent')
      expect(mod.Route).toHaveProperty('head')
      expect(mod.Route).toHaveProperty('shellComponent')
    })

    it('head returns correct meta and links', async () => {
      const mod = await import('./__root')
      const headResult = (mod.Route as { head: () => unknown }).head()
      expect(headResult).toHaveProperty('meta')
      expect(headResult).toHaveProperty('links')
      expect(headResult).toHaveProperty('scripts')
    })
  })

  describe('NotFound component', () => {
    it('renders 404 heading', async () => {
      const mod = await import('./__root')
      const NotFound = (mod.Route as { notFoundComponent: React.ComponentType })
        .notFoundComponent
      render(<NotFound />)
      expect(screen.getByText('404')).toBeTruthy()
    })

    it('renders Page Not Found message', async () => {
      const mod = await import('./__root')
      const NotFound = (mod.Route as { notFoundComponent: React.ComponentType })
        .notFoundComponent
      render(<NotFound />)
      expect(screen.getByText('Page Not Found')).toBeTruthy()
    })

    it('renders description text', async () => {
      const mod = await import('./__root')
      const NotFound = (mod.Route as { notFoundComponent: React.ComponentType })
        .notFoundComponent
      render(<NotFound />)
      expect(
        screen.getByText(
          /The page you're looking for doesn't exist or has been moved/,
        ),
      ).toBeTruthy()
    })

    it('renders a Go Home link pointing to /', async () => {
      const mod = await import('./__root')
      const NotFound = (mod.Route as { notFoundComponent: React.ComponentType })
        .notFoundComponent
      render(<NotFound />)
      const link = screen.getByText('Go Home')
      expect(link.closest('a')?.getAttribute('href')).toBe('/')
    })
  })

  describe('RootDocument (shellComponent)', () => {
    it('renders Header, Footer, children, and Toaster', async () => {
      const mod = await import('./__root')
      const RootDocument = (
        mod.Route as {
          shellComponent: React.ComponentType<{
            children: React.ReactNode
          }>
        }
      ).shellComponent
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
      // Mock the dynamic imports that DevTools loads
      const mockTanStackDevtools = ({
        children,
      }: {
        children?: React.ReactNode
        config?: unknown
        plugins?: Array<unknown>
      }) => <div data-testid="tanstack-devtools">{children}</div>
      const mockRouterDevtoolsPanel = () => (
        <div data-testid="router-devtools-panel" />
      )
      const mockQueryPlugin = { name: 'Query', render: <div /> }

      vi.doMock('@tanstack/react-devtools', () => ({
        TanStackDevtools: mockTanStackDevtools,
      }))
      vi.doMock('@tanstack/react-router-devtools', () => ({
        TanStackRouterDevtoolsPanel: mockRouterDevtoolsPanel,
      }))
      vi.doMock('@/integrations/tanstack-query/devtools', () => ({
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
        createRootRouteWithContext: () => (config: unknown) => config,
        HeadContent: () => null,
        Scripts: () => null,
        Outlet: ({ children }: { children?: React.ReactNode }) => (
          <div data-testid="outlet">{children}</div>
        ),
        ScrollRestoration: () => null,
      }))
      vi.doMock('@/components/layout/Header', () => ({
        Header: () => <div data-testid="header">Header</div>,
      }))
      vi.doMock('@/components/layout/Footer', () => ({
        Footer: () => <div data-testid="footer">Footer</div>,
      }))
      vi.doMock('@/components/ui/shadcn/sonner', () => ({
        Toaster: () => <div data-testid="toaster">Toaster</div>,
      }))
      vi.doMock('@/styles.css?url', () => ({ default: 'styles.css' }))

      const { DevTools: DevToolsComponent } =
        (await import('./__root')) as unknown as {
          DevTools: React.ComponentType
        }

      // DevTools is not exported — access it via RootDocument rendered with DEV=true
      // Since DevTools is internal, we test it indirectly through RootDocument
      // However lines 27-39 are the setPanel callback. Let's test the RootDocument in DEV mode.
      const mod = await import('./__root')
      const RootDocument = (
        mod.Route as {
          shellComponent: React.ComponentType<{ children: React.ReactNode }>
        }
      ).shellComponent

      const originalDev = import.meta.env.DEV
      // @ts-expect-error -- overriding for test
      import.meta.env.DEV = true

      const { findByTestId } = render(
        <RootDocument>
          <div>Content</div>
        </RootDocument>,
      )

      // Wait for the dynamic imports to resolve and setPanel to be called
      const devtools = await findByTestId('tanstack-devtools')
      expect(devtools).toBeTruthy()

      // @ts-expect-error -- restoring for test
      import.meta.env.DEV = originalDev
    })
  })
})
