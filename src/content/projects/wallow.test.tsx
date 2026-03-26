import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Content, meta } from './wallow'

describe('wallow project', () => {
  afterEach(() => {
    cleanup()
  })

  describe('meta', () => {
    it('has the correct slug', () => {
      expect(meta.slug).toBe('wallow')
    })

    it('has the correct title', () => {
      expect(meta.title).toBe('Wallow')
    })

    it('has a description', () => {
      expect(meta.description).toContain('multi-tenant SaaS platform')
    })

    it('has the correct client', () => {
      expect(meta.client).toBe('BC Solutions, LLC')
    })

    it('has the correct year', () => {
      expect(meta.year).toBe(2025)
    })

    it('has all expected tags', () => {
      expect(meta.tags).toEqual([
        '.NET',
        'ASP.NET Core',
        'PostgreSQL',
        'OpenIddict',
        'Docker',
      ])
    })

    it('is marked as featured', () => {
      expect(meta.featured).toBe(true)
    })

    it('has an image path', () => {
      expect(meta.image).toBe('/images/projects/wallow.svg')
    })
  })

  describe('Content', () => {
    it('renders without crashing', () => {
      const { container } = render(<Content />)
      expect(container.querySelector('.showcase-content')).toBeTruthy()
    })

    it('renders the Overview heading', () => {
      render(<Content />)
      expect(screen.getByText('Overview')).toBeTruthy()
    })

    it('renders the Architecture heading', () => {
      render(<Content />)
      expect(screen.getByText('Architecture')).toBeTruthy()
    })

    it('renders the Key Modules heading', () => {
      render(<Content />)
      expect(screen.getByText('Key Modules')).toBeTruthy()
    })

    it('renders the Technical Highlights heading', () => {
      render(<Content />)
      expect(screen.getByText('Technical Highlights')).toBeTruthy()
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

    it('renders all list items in Key Modules', () => {
      const { container } = render(<Content />)
      const lists = container.querySelectorAll('ul')
      expect(lists.length).toBe(2)
      expect(lists[0].querySelectorAll('li').length).toBe(5)
    })

    it('renders all list items in Technical Highlights', () => {
      const { container } = render(<Content />)
      const lists = container.querySelectorAll('ul')
      expect(lists[1].querySelectorAll('li').length).toBe(5)
    })

    it('mentions PKCE in multiple sections', () => {
      render(<Content />)
      const matches = screen.getAllByText(/PKCE/)
      expect(matches.length).toBe(2)
    })

    it('mentions PostgreSQL in Infrastructure', () => {
      render(<Content />)
      expect(screen.getByText(/PostgreSQL and Valkey/)).toBeTruthy()
    })
  })
})
