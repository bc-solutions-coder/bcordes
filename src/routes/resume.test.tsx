import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => config,
}))

vi.mock('lucide-react', () => ({
  Download: (props: Record<string, unknown>) => (
    <svg data-testid="download-icon" {...props} />
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

vi.mock('@/components/ui/shadcn/badge', () => ({
  Badge: ({
    children,
    ...rest
  }: {
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <span data-testid="badge" {...rest}>
      {children}
    </span>
  ),
}))

describe('resume route', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Route config', () => {
    it('exports a route config with component', async () => {
      const mod = await import('./resume')
      expect(mod.Route).toBeDefined()
      expect(mod.Route).toHaveProperty('component')
    })
  })

  describe('ResumePage component', () => {
    it('renders page heading', async () => {
      const mod = await import('./resume')
      const ResumePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ResumePage />)
      expect(screen.getByText('Resume')).toBeTruthy()
    })

    it('renders experience subtitle', async () => {
      const mod = await import('./resume')
      const ResumePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ResumePage />)
      expect(
        screen.getByText(
          '6+ years of professional software engineering experience',
        ),
      ).toBeTruthy()
    })

    it('renders Download PDF link', async () => {
      const mod = await import('./resume')
      const ResumePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ResumePage />)
      const downloadLink = screen.getByText('Download PDF')
      expect(downloadLink.closest('a')?.getAttribute('href')).toBe(
        '/Cordes-Resume.pdf',
      )
    })

    it('renders Experience section with all jobs', async () => {
      const mod = await import('./resume')
      const ResumePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ResumePage />)
      expect(screen.getByText('Experience')).toBeTruthy()
      expect(screen.getByText('Freelance Software Engineer')).toBeTruthy()
      expect(screen.getByText('Drop')).toBeTruthy()
      expect(screen.getByText('Valiantys')).toBeTruthy()
      expect(screen.getByText('Hyperion, LLC')).toBeTruthy()
      expect(screen.getByText('Quality Assurance Intern')).toBeTruthy()
      expect(screen.getByText('Flightdocs Inc')).toBeTruthy()
    })

    it('renders Skills section with categories', async () => {
      const mod = await import('./resume')
      const ResumePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ResumePage />)
      expect(screen.getByText('Skills')).toBeTruthy()
      expect(screen.getByText('Frontend')).toBeTruthy()
      expect(screen.getByText('Backend')).toBeTruthy()
      expect(screen.getByText('Cloud & Infrastructure')).toBeTruthy()
      expect(screen.getByText('Tools & Platforms')).toBeTruthy()
      expect(screen.getByText('Databases')).toBeTruthy()
    })

    it('renders skill badges', async () => {
      const mod = await import('./resume')
      const ResumePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ResumePage />)
      expect(screen.getByText('TypeScript')).toBeTruthy()
      expect(screen.getByText('React')).toBeTruthy()
      expect(screen.getByText('Node.js')).toBeTruthy()
      expect(screen.getByText('Docker')).toBeTruthy()
    })

    it('renders Education section', async () => {
      const mod = await import('./resume')
      const ResumePage = (mod.Route as { component: React.ComponentType })
        .component
      render(<ResumePage />)
      expect(screen.getByText('Education')).toBeTruthy()
      expect(
        screen.getByText('Bachelor of Science, Software Engineering'),
      ).toBeTruthy()
      expect(
        screen.getByText('Florida Gulf Coast University, Fort Myers, FL'),
      ).toBeTruthy()
    })
  })
})
