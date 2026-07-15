import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Content, meta } from './bcordes'

describe('bcordes project', () => {
  afterEach(() => {
    cleanup()
  })

  describe('meta', () => {
    it('has the correct slug', () => {
      expect(meta.slug).toBe('bcordes')
    })

    it('has the correct title', () => {
      expect(meta.title).toBe('Bcordes')
    })

    it('has a description', () => {
      expect(meta.description).toContain('professional portfolio')
    })

    it('has the correct client', () => {
      expect(meta.client).toBe('BC Solutions, LLC')
    })

    it('has the correct year', () => {
      expect(meta.year).toBe(2025)
    })

    it('has all expected tags', () => {
      expect(meta.tags).toEqual([
        'React',
        'TypeScript',
        'TanStack Start',
        'Tailwind CSS',
        'Docker',
      ])
    })

    it('is marked as featured', () => {
      expect(meta.featured).toBe(true)
    })

    it('has an image path', () => {
      expect(meta.image).toBe('/images/projects/bcordes.svg')
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

    it('renders the Key Features heading', () => {
      render(<Content />)
      expect(screen.getByText('Key Features')).toBeTruthy()
    })

    it('renders the Technical Highlights heading', () => {
      render(<Content />)
      expect(screen.getByText('Technical Highlights')).toBeTruthy()
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

    it('renders all list items in Key Features', () => {
      const { container } = render(<Content />)
      const lists = container.querySelectorAll('ul')
      expect(lists.length).toBe(2)
      expect(lists[0].querySelectorAll('li').length).toBe(4)
    })

    it('renders all list items in Technical Highlights', () => {
      const { container } = render(<Content />)
      const lists = container.querySelectorAll('ul')
      expect(lists[1].querySelectorAll('li').length).toBe(5)
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
