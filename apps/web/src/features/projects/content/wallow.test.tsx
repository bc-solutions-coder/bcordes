import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderProjectRoute } from '../../../../testing/render-project-route'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { Content } from './wallow'
import { getFeaturedShowcases } from './index'

describe('wallow project', () => {
  beforeEach(() => {
    controlMotion(true)
    controlIntersections()
    vi.stubGlobal('scrollTo', vi.fn())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('publishes wallow at its project URL with its details', async () => {
    await renderProjectRoute()
    const link = screen.getByRole('link', { name: /Wallow/ })
    expect(link).toHaveAttribute('href', '/projects/wallow')
    fireEvent.click(link)
    expect(
      await screen.findByRole('heading', { name: 'Wallow', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/A multi-tenant SaaS platform built with ASP.NET Core/i),
    ).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()
    for (const tag of [
      '.NET',
      'ASP.NET Core',
      'PostgreSQL',
      'OpenIddict',
      'Docker',
    ])
      expect(screen.getByText(tag)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Wallow' })).toHaveAttribute(
      'src',
      '/images/projects/wallow.svg',
    )
    expect(getFeaturedShowcases().map((project) => project.slug)).toContain(
      'wallow',
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

    it('renders the Key Modules heading', () => {
      render(<Content />)
      expect(screen.getByRole('heading', { name: 'Key Modules' })).toBeTruthy()
    })

    it('renders the Technical Highlights heading', () => {
      render(<Content />)
      expect(
        screen.getByRole('heading', { name: 'Technical Highlights' }),
      ).toBeTruthy()
    })

    it('renders overview description text', () => {
      render(<Content />)
      expect(
        screen.getByText(/modular, multi-tenant SaaS backend/i),
      ).toBeTruthy()
    })

    it('renders architecture description text', () => {
      render(<Content />)
      expect(screen.getByText(/clean, modular architecture/i)).toBeTruthy()
    })

    it('renders the Identity & Auth module', () => {
      render(<Content />)
      expect(screen.getByText('Identity & Auth')).toBeTruthy()
    })

    it('renders the Billing module', () => {
      render(<Content />)
      expect(screen.getByText('Billing')).toBeTruthy()
    })

    it('renders the Storage module', () => {
      render(<Content />)
      expect(screen.getByText('Storage')).toBeTruthy()
    })

    it('renders the Messaging module', () => {
      render(<Content />)
      expect(screen.getByText('Messaging')).toBeTruthy()
    })

    it('renders the Showcases module', () => {
      render(<Content />)
      expect(screen.getByText('Showcases')).toBeTruthy()
    })

    it('renders Multi-tenancy highlight', () => {
      render(<Content />)
      expect(screen.getByText('Multi-tenancy')).toBeTruthy()
    })

    it('renders OpenIddict Integration highlight', () => {
      render(<Content />)
      expect(screen.getByText('OpenIddict Integration')).toBeTruthy()
    })

    it('renders Rate Limiting highlight', () => {
      render(<Content />)
      expect(screen.getByText('Rate Limiting')).toBeTruthy()
    })

    it('renders API Standards highlight', () => {
      render(<Content />)
      expect(screen.getByText('API Standards')).toBeTruthy()
    })

    it('renders Infrastructure highlight', () => {
      render(<Content />)
      expect(screen.getByText('Infrastructure')).toBeTruthy()
    })

    it('describes PKCE support in identity and provider integration', () => {
      render(<Content />)
      for (const name of ['Identity & Auth', 'OpenIddict Integration']) {
        const item = screen.getByText(name).closest('li')
        expect(item).toHaveTextContent(/PKCE/)
      }
    })

    it('mentions PostgreSQL in Infrastructure', () => {
      render(<Content />)
      expect(screen.getByText(/PostgreSQL and Valkey/)).toBeTruthy()
    })
  })
})
