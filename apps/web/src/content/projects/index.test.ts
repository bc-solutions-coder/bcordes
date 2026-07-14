// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { ShowcaseMeta } from '@/content/projects'
import {
  getFeaturedShowcases,
  getShowcase,
  getShowcaseContent,
  getShowcases,
} from '@/content/projects'

describe('project content data functions', () => {
  describe('getShowcases', () => {
    it('returns an array of ShowcaseMeta objects', () => {
      const showcases = getShowcases()
      expect(Array.isArray(showcases)).toBe(true)
      expect(showcases.length).toBeGreaterThanOrEqual(2)
    })

    it('does not include the Content component on returned items', () => {
      const showcases = getShowcases()
      for (const item of showcases) {
        expect(item).not.toHaveProperty('Content')
      }
    })

    it('returns items with required ShowcaseMeta fields', () => {
      const showcases = getShowcases()
      for (const item of showcases) {
        expect(item).toHaveProperty('slug')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('description')
        expect(item).toHaveProperty('client')
        expect(item).toHaveProperty('year')
        expect(item).toHaveProperty('tags')
        expect(item).toHaveProperty('featured')
      }
    })

    it('sorts featured items before non-featured, then by year descending', () => {
      const showcases = getShowcases()
      for (let i = 0; i < showcases.length - 1; i++) {
        const a = showcases[i]
        const b = showcases[i + 1]
        if (a.featured !== b.featured) {
          expect(a.featured).toBe(true)
        } else {
          expect(a.year).toBeGreaterThanOrEqual(b.year)
        }
      }
    })

    it('includes the known project slugs', () => {
      const slugs = getShowcases().map((s) => s.slug)
      expect(slugs).toContain('wallow')
      expect(slugs).toContain('bcordes')
    })
  })

  describe('getFeaturedShowcases', () => {
    it('returns only featured entries', () => {
      const featured = getFeaturedShowcases()
      expect(featured.length).toBeGreaterThanOrEqual(1)
      for (const item of featured) {
        expect(item.featured).toBe(true)
      }
    })

    it('does not include the Content component', () => {
      const featured = getFeaturedShowcases()
      for (const item of featured) {
        expect(item).not.toHaveProperty('Content')
      }
    })

    it('is a subset of getShowcases', () => {
      const all = getShowcases()
      const featured = getFeaturedShowcases()
      const allSlugs = all.map((s) => s.slug)
      for (const item of featured) {
        expect(allSlugs).toContain(item.slug)
      }
    })

    it('is sorted by year descending among featured items', () => {
      const featured = getFeaturedShowcases()
      for (let i = 0; i < featured.length - 1; i++) {
        expect(featured[i].year).toBeGreaterThanOrEqual(featured[i + 1].year)
      }
    })
  })

  describe('getShowcase', () => {
    it('returns a full Showcase object for a known slug', () => {
      const showcase = getShowcase('wallow')
      expect(showcase).toBeDefined()
      expect(showcase!.slug).toBe('wallow')
      expect(showcase!.title).toBe('Wallow')
      expect(showcase!.Content).toBeTypeOf('function')
    })

    it('returns a full Showcase for the bcordes slug', () => {
      const showcase = getShowcase('bcordes')
      expect(showcase).toBeDefined()
      expect(showcase!.slug).toBe('bcordes')
      expect(showcase!.Content).toBeTypeOf('function')
    })

    it('returns undefined for an unknown slug', () => {
      const showcase = getShowcase('nonexistent-project')
      expect(showcase).toBeUndefined()
    })

    it('returns undefined for an empty string slug', () => {
      const showcase = getShowcase('')
      expect(showcase).toBeUndefined()
    })
  })

  describe('getShowcaseContent', () => {
    it('returns a component function for a valid slug', () => {
      const content = getShowcaseContent('wallow')
      expect(content).toBeTypeOf('function')
    })

    it('returns a component function for the bcordes slug', () => {
      const content = getShowcaseContent('bcordes')
      expect(content).toBeTypeOf('function')
    })

    it('returns undefined for an invalid slug', () => {
      const content = getShowcaseContent('does-not-exist')
      expect(content).toBeUndefined()
    })

    it('returns the same Content as getShowcase', () => {
      const showcase = getShowcase('wallow')
      const content = getShowcaseContent('wallow')
      expect(content).toBe(showcase!.Content)
    })
  })
})
