import { afterEach, describe, expect, it, vi } from 'vitest'
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
  createFileRoute: () => (config: Record<string, unknown>) => ({
    ...config,
    useLoaderData: () => ({ showcases: mockShowcases }),
  }),
}))

vi.mock('~/components/home/Hero', () => ({
  Hero: () => <div data-testid="hero">Hero</div>,
}))

vi.mock('~/components/home/ServicesGrid', () => ({
  ServicesGrid: () => <div data-testid="services-grid">ServicesGrid</div>,
}))

vi.mock('~/components/home/SkillsShowcase', () => ({
  SkillsShowcase: () => <div data-testid="skills-showcase">SkillsShowcase</div>,
}))

vi.mock('~/components/home/FeaturedWork', () => ({
  FeaturedWork: ({ showcases }: { showcases: Array<unknown> }) => (
    <div data-testid="featured-work">
      FeaturedWork: {showcases.length} items
    </div>
  ),
}))

vi.mock('@/content/projects', () => ({
  getFeaturedShowcases: () => mockShowcases,
}))

describe('index route', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Route config', () => {
    it('exports a route config with component and loader', async () => {
      const mod = await import('./index')
      expect(mod.Route).toBeDefined()
      expect(mod.Route).toHaveProperty('component')
      expect(mod.Route).toHaveProperty('loader')
    })

    it('loader returns showcases from getFeaturedShowcases', async () => {
      const mod = await import('./index')
      const loader = (mod.Route as { loader: () => unknown }).loader
      const result = loader() as { showcases: Array<unknown> }
      expect(result.showcases).toEqual(mockShowcases)
    })
  })

  describe('HomePage component', () => {
    it('renders Hero, ServicesGrid, FeaturedWork, and SkillsShowcase', async () => {
      const mod = await import('./index')
      const HomePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<HomePage />)
      expect(screen.getByTestId('hero')).toBeTruthy()
      expect(screen.getByTestId('services-grid')).toBeTruthy()
      expect(screen.getByTestId('featured-work')).toBeTruthy()
      expect(screen.getByTestId('skills-showcase')).toBeTruthy()
    })

    it('passes showcases to FeaturedWork', async () => {
      const mod = await import('./index')
      const HomePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<HomePage />)
      expect(screen.getByText('FeaturedWork: 1 items')).toBeTruthy()
    })

    it('renders "Let\'s Work Together" section', async () => {
      const mod = await import('./index')
      const HomePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<HomePage />)
      expect(screen.getByText("Let's Work Together")).toBeTruthy()
    })

    it('renders Get in Touch link to /contact', async () => {
      const mod = await import('./index')
      const HomePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<HomePage />)
      const link = screen.getByText('Get in Touch')
      expect(link.closest('a')?.getAttribute('href')).toBe('/contact')
    })
  })
})
