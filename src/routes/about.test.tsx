import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => config,
}))

vi.mock('@/components/about/AboutHero', () => ({
  AboutHero: () => <div data-testid="about-hero">AboutHero</div>,
}))

vi.mock('@/components/about/Timeline', () => ({
  Timeline: () => <div data-testid="timeline">Timeline</div>,
}))

vi.mock('@/components/shared/FadeInView', () => ({
  FadeInView: ({
    children,
    ...rest
  }: {
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <div data-testid="fade-in-view" {...rest}>
      {children}
    </div>
  ),
}))

describe('about route', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Route config', () => {
    it('exports a route config with component', async () => {
      const mod = await import('./about')
      expect(mod.Route).toBeDefined()
      expect(mod.Route).toHaveProperty('component')
    })
  })

  describe('AboutPage component', () => {
    it('renders AboutHero', async () => {
      const mod = await import('./about')
      const AboutPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<AboutPage />)
      expect(screen.getByTestId('about-hero')).toBeTruthy()
    })

    it('renders Timeline', async () => {
      const mod = await import('./about')
      const AboutPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<AboutPage />)
      expect(screen.getByTestId('timeline')).toBeTruthy()
    })

    it('renders My Approach section', async () => {
      const mod = await import('./about')
      const AboutPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<AboutPage />)
      expect(screen.getByText('My Approach')).toBeTruthy()
    })

    it('renders all four value cards', async () => {
      const mod = await import('./about')
      const AboutPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<AboutPage />)
      expect(screen.getByText('Quality-Driven Development')).toBeTruthy()
      expect(screen.getByText('Clear Communication')).toBeTruthy()
      expect(screen.getByText('Modern Tech Stack')).toBeTruthy()
      expect(screen.getByText('Client-Focused Solutions')).toBeTruthy()
    })

    it('renders CTA section with Get in Touch link', async () => {
      const mod = await import('./about')
      const AboutPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<AboutPage />)
      expect(screen.getByText("Let's Build Something Great")).toBeTruthy()
      const link = screen.getByText('Get in Touch')
      expect(link.closest('a')?.getAttribute('href')).toBe('/contact')
    })
  })
})
