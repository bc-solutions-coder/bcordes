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

vi.mock('@/components/ui/sonner', () => ({
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
})
