import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { renderSerializedProjects } from '../../../../testing/render-serialized-projects'
import {
  getFeaturedShowcases,
  getShowcase,
  getShowcaseContent,
  getShowcases,
} from '.'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Published project catalog', () => {
  it.each([
    { label: 'all', load: getShowcases },
    { label: 'featured', load: getFeaturedShowcases },
  ])(
    'returns $label project metadata that survives router serialization',
    async ({ load }) => {
      vi.stubGlobal('scrollTo', vi.fn())
      await renderSerializedProjects(load)
      expect(screen.getByRole('link', { name: /Bcordes/ })).toHaveAttribute(
        'href',
        '/projects/bcordes',
      )
      expect(screen.getByRole('link', { name: /Wallow/ })).toHaveAttribute(
        'href',
        '/projects/wallow',
      )
      expect(
        screen.getByRole('img', { name: 'Bcordes project thumbnail' }),
      ).toHaveAttribute('src', '/images/projects/bcordes.svg')
      expect(
        screen.getByRole('img', { name: 'Wallow project thumbnail' }),
      ).toHaveAttribute('src', '/images/projects/wallow.svg')
      expect(screen.getByText('TanStack Start')).toBeInTheDocument()
      expect(screen.getByText('ASP.NET Core')).toBeInTheDocument()
    },
  )
  it('includes the known project slugs', () => {
    const slugs = getShowcases().map((project) => project.slug)
    expect(slugs).toContain('wallow')
    expect(slugs).toContain('bcordes')
  })
  it('is a subset of getShowcases', () => {
    const all = getShowcases().map((project) => project.slug)
    for (const project of getFeaturedShowcases())
      expect(all).toContain(project.slug)
  })
  describe('getShowcase', () => {
    it.each([
      {
        slug: 'wallow',
        title: 'Wallow',
        body: /modular, multi-tenant SaaS backend/i,
      },
      { slug: 'bcordes', title: 'Bcordes', body: /full-stack portfolio site/i },
    ])(
      'returns renderable $slug content for its slug',
      ({ slug, title, body }) => {
        const project = getShowcase(slug)
        if (!project) throw new Error('Published project is missing')
        expect(project.slug).toBe(slug)
        expect(project.title).toBe(title)
        render(createElement(project.Content))
        expect(screen.getByText(body)).toBeInTheDocument()
      },
    )
    it('returns undefined for an unknown slug', () => {
      expect(getShowcase('nonexistent-project')).toBeUndefined()
    })
    it('returns undefined for an empty string slug', () => {
      expect(getShowcase('')).toBeUndefined()
    })
  })
  describe('getShowcaseContent', () => {
    it.each([
      { slug: 'wallow', body: /modular, multi-tenant SaaS backend/i },
      { slug: 'bcordes', body: /full-stack portfolio site/i },
    ])('returns renderable $slug content for its slug', ({ slug, body }) => {
      const Content = getShowcaseContent(slug)
      if (!Content) throw new Error('Published project content is missing')
      render(createElement(Content))
      expect(screen.getByText(body)).toBeInTheDocument()
    })
    it('returns undefined for an invalid slug', () => {
      expect(getShowcaseContent('does-not-exist')).toBeUndefined()
    })
  })
})
