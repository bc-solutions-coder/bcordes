import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderProjectRoute } from '../../../../testing/render-project-route'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { Content } from './bcordes'
import { getFeaturedShowcases } from './index'

describe('bcordes project', () => {
  beforeEach(() => {
    controlMotion(true)
    controlIntersections()
    vi.stubGlobal('scrollTo', vi.fn())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('publishes bcordes at its project URL with its details', async () => {
    await renderProjectRoute()
    const link = screen.getByRole('link', { name: /Bcordes/ })
    expect(link).toHaveAttribute('href', '/projects/bcordes')
    fireEvent.click(link)
    expect(
      await screen.findByRole('heading', { name: 'Bcordes', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/professional portfolio/i)).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()
    for (const tag of [
      'React',
      'TypeScript',
      'TanStack Start',
      'Tailwind CSS',
      'Docker',
    ])
      expect(screen.getByText(tag)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bcordes' })).toHaveAttribute(
      'src',
      '/images/projects/bcordes.svg',
    )
    expect(getFeaturedShowcases().map((project) => project.slug)).toContain(
      'bcordes',
    )
  })

  describe('Content', () => {
    it('renders the Overview heading', () => {
      render(<Content />)
      expect(screen.getByRole('heading', { name: 'Overview' })).toBeTruthy()
    })

    it('renders the Architecture heading', () => {
      render(<Content />)
      expect(screen.getByRole('heading', { name: 'Architecture' })).toBeTruthy()
    })

    it('renders the Key Features heading', () => {
      render(<Content />)
      expect(screen.getByRole('heading', { name: 'Key Features' })).toBeTruthy()
    })

    it('renders the Technical Highlights heading', () => {
      render(<Content />)
      expect(
        screen.getByRole('heading', { name: 'Technical Highlights' }),
      ).toBeTruthy()
    })

    it('renders overview description text', () => {
      render(<Content />)
      expect(screen.getByText(/full-stack portfolio site/i)).toBeTruthy()
    })

    it('renders architecture description about BFF pattern', () => {
      render(<Content />)
      expect(screen.getByText(/Backend-for-Frontend/)).toBeTruthy()
    })

    it('renders the Content Pipeline feature', () => {
      render(<Content />)
      expect(screen.getByText('Content Pipeline')).toBeTruthy()
    })

    it('renders the OIDC Authentication feature', () => {
      render(<Content />)
      expect(screen.getByText('OIDC Authentication')).toBeTruthy()
    })

    it('renders the Contact System feature', () => {
      render(<Content />)
      expect(screen.getByText('Contact System')).toBeTruthy()
    })

    it('renders the Admin Dashboard feature', () => {
      render(<Content />)
      expect(screen.getByText('Admin Dashboard')).toBeTruthy()
    })

    it('renders Server Functions highlight', () => {
      render(<Content />)
      expect(screen.getByText('Server Functions')).toBeTruthy()
    })

    it('renders File-Based Routing highlight', () => {
      render(<Content />)
      expect(screen.getByText('File-Based Routing')).toBeTruthy()
    })

    it('renders SSR highlight', () => {
      render(<Content />)
      expect(screen.getByText('SSR')).toBeTruthy()
    })

    it('renders Dark Mode highlight', () => {
      render(<Content />)
      expect(screen.getByText('Dark Mode')).toBeTruthy()
    })

    it('renders CI/CD highlight', () => {
      render(<Content />)
      expect(screen.getByText('CI/CD')).toBeTruthy()
    })

    it('mentions TanStack Start in the architecture', () => {
      render(<Content />)
      expect(screen.getByText(/TanStack Start with Nitro/)).toBeTruthy()
    })

    it('mentions PKCE in the OIDC feature description', () => {
      render(<Content />)
      expect(screen.getByText(/PKCE flow/)).toBeTruthy()
    })

    it('mentions Zod validation in the Contact System', () => {
      render(<Content />)
      expect(screen.getByText(/Zod validation/)).toBeTruthy()
    })

    it('mentions Docker in CI/CD highlight', () => {
      render(<Content />)
      expect(screen.getByText(/Docker images/)).toBeTruthy()
    })
  })
})
