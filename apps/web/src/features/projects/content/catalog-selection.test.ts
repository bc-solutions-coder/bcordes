import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ShowcaseMeta } from './index'

afterEach(() => {
  vi.doUnmock('./wallow')
  vi.doUnmock('./bcordes')
  vi.resetModules()
})

describe('Catalog selection', () => {
  it.each([
    {
      label: 'two featured projects with different years',
      wallow: { year: 2023, featured: true },
      bcordes: { year: 2026, featured: true },
      all: ['bcordes', 'wallow'],
      featured: ['bcordes', 'wallow'],
    },
    {
      label: 'an older featured project and newer nonfeatured project',
      wallow: { year: 2023, featured: true },
      bcordes: { year: 2026, featured: false },
      all: ['wallow', 'bcordes'],
      featured: ['wallow'],
    },
  ])(
    'orders the catalog and selects featured entries for $label',
    async ({ wallow, bcordes, all, featured }) => {
      vi.resetModules()
      for (const [module, slug, flags] of [
        ['./wallow', 'wallow', wallow],
        ['./bcordes', 'bcordes', bcordes],
      ] satisfies Array<
        [string, string, Pick<ShowcaseMeta, 'year' | 'featured'>]
      >) {
        const meta: ShowcaseMeta = {
          slug,
          title: slug,
          description: 'Controlled catalog metadata',
          client: 'Fixture client',
          tags: ['TypeScript'],
          ...flags,
        }
        vi.doMock(module, () => ({ meta, Content: () => null }))
      }
      const catalog = await import('./index')
      expect(catalog.getShowcases().map((project) => project.slug)).toEqual(all)
      expect(
        catalog.getFeaturedShowcases().map((project) => project.slug),
      ).toEqual(featured)
    },
  )
})
