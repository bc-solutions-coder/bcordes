import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => config,
}))

vi.mock('lucide-react', () => ({
  Github: (props: Record<string, unknown>) => (
    <svg data-testid="github-icon" {...props} />
  ),
  Linkedin: (props: Record<string, unknown>) => (
    <svg data-testid="linkedin-icon" {...props} />
  ),
  Mail: (props: Record<string, unknown>) => (
    <svg data-testid="mail-icon" {...props} />
  ),
  MapPin: (props: Record<string, unknown>) => (
    <svg data-testid="mappin-icon" {...props} />
  ),
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

vi.mock('@/components/contact/ContactForm', () => ({
  ContactForm: () => <div data-testid="contact-form">ContactForm</div>,
}))

describe('contact route', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Route config', () => {
    it('exports a route config with component', async () => {
      const mod = await import('./contact')
      expect(mod.Route).toBeDefined()
      expect(mod.Route).toHaveProperty('component')
    })
  })

  describe('ContactPage component', () => {
    it('renders page heading', async () => {
      const mod = await import('./contact')
      const ContactPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ContactPage />)
      expect(screen.getByText('Get in Touch')).toBeTruthy()
    })

    it('renders contact info section with all items', async () => {
      const mod = await import('./contact')
      const ContactPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ContactPage />)
      expect(screen.getByText('Contact Information')).toBeTruthy()
      expect(screen.getByText('BC@bcordes.dev')).toBeTruthy()
      expect(screen.getByText('linkedin.com/in/bryancordes')).toBeTruthy()
      expect(screen.getByText('github.com/BC-Solutions-Coder')).toBeTruthy()
      expect(screen.getByText('Remote / US-based')).toBeTruthy()
    })

    it('renders email link with mailto href', async () => {
      const mod = await import('./contact')
      const ContactPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ContactPage />)
      const emailLink = screen.getByText('BC@bcordes.dev')
      expect(emailLink.closest('a')?.getAttribute('href')).toBe(
        'mailto:BC@bcordes.dev',
      )
    })

    it('renders availability status', async () => {
      const mod = await import('./contact')
      const ContactPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ContactPage />)
      expect(screen.getByText('Available for projects')).toBeTruthy()
    })

    it('renders ContactForm', async () => {
      const mod = await import('./contact')
      const ContactPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ContactPage />)
      expect(screen.getByTestId('contact-form')).toBeTruthy()
    })

    it('renders Send a Message heading', async () => {
      const mod = await import('./contact')
      const ContactPage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ContactPage />)
      expect(screen.getByText('Send a Message')).toBeTruthy()
    })
  })
})
