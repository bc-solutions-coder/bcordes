import { afterEach, assert, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mockShowcases = [
  {
    slug: 'test-project',
    title: 'Test Project',
    description: 'A test project',
    client: 'Test Client',
    year: 2025,
    tags: ['React'],
    featured: true,
  },
]

const { capturedLoader } = vi.hoisted(() => ({
  capturedLoader: vi.fn<() => unknown>(),
}))

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
  createFileRoute:
    () =>
    (config: { loader: () => unknown; component: React.ComponentType }) => {
      capturedLoader.mockImplementation(config.loader)
      return {
        options: config,
        useLoaderData: () => ({ showcases: mockShowcases }),
      }
    },
}))

vi.mock('@/features/home', () => ({
  Hero: () => <div data-testid="hero">Hero</div>,
  ServicesGrid: () => <div data-testid="services-grid">ServicesGrid</div>,
  SkillsShowcase: () => <div data-testid="skills-showcase">SkillsShowcase</div>,
  FeaturedWork: ({ showcases }: { showcases: Array<unknown> }) => (
    <div data-testid="featured-work">
      FeaturedWork: {showcases.length} items
    </div>
  ),
}))

vi.mock('@/features/projects', () => ({
  getFeaturedShowcases: () => mockShowcases,
}))

vi.mock('@/shared/auth', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}))

describe('index route', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Route config', () => {
    it('exports a route config with component and loader', async () => {
      const mod = await import('./index')
      expect(mod.Route).toBeDefined()
      expect(mod.Route.options).toHaveProperty('component')
      expect(mod.Route.options).toHaveProperty('loader')
    })

    it('loader returns showcases from getFeaturedShowcases', async () => {
      await import('./index')
      expect(capturedLoader()).toEqual({ showcases: mockShowcases })
    })
  })

  describe('HomePage component', () => {
    it('renders Hero, ServicesGrid, FeaturedWork, and SkillsShowcase', async () => {
      const mod = await import('./index')
      const HomePage = mod.Route.options.component
      assert(HomePage)
      render(<HomePage />)
      expect(screen.getByTestId('hero')).toBeTruthy()
      expect(screen.getByTestId('services-grid')).toBeTruthy()
      expect(screen.getByTestId('featured-work')).toBeTruthy()
      expect(screen.getByTestId('skills-showcase')).toBeTruthy()
    })

    it('passes showcases to FeaturedWork', async () => {
      const mod = await import('./index')
      const HomePage = mod.Route.options.component
      assert(HomePage)
      render(<HomePage />)
      expect(screen.getByText('FeaturedWork: 1 items')).toBeTruthy()
    })

    it('renders "Let\'s Work Together" section', async () => {
      const mod = await import('./index')
      const HomePage = mod.Route.options.component
      assert(HomePage)
      render(<HomePage />)
      expect(screen.getByText("Let's Work Together")).toBeTruthy()
    })

    it('renders Get in Touch link to /contact', async () => {
      const mod = await import('./index')
      const HomePage = mod.Route.options.component
      assert(HomePage)
      render(<HomePage />)
      const link = screen.getByText('Get in Touch')
      expect(link.closest('a')?.getAttribute('href')).toBe('/contact')
    })
  })
})
