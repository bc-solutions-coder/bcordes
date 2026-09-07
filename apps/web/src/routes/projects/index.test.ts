import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShowcaseMeta } from '@/features/projects'

const mockGetShowcases = vi.fn()

vi.mock('@/features/projects', () => ({
  getShowcases: mockGetShowcases,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
}))

const routeModule = await import('./index')
const loader = (
  routeModule.Route as unknown as {
    loader: () => { showcases: Array<ShowcaseMeta> }
  }
).loader

const fakeShowcases: Array<ShowcaseMeta> = [
  {
    slug: 'project-a',
    title: 'Project A',
    description: 'Description A',
    client: 'Client A',
    year: 2024,
    tags: ['react', 'typescript'],
    featured: true,
  },
  {
    slug: 'project-b',
    title: 'Project B',
    description: 'Description B',
    client: 'Client B',
    year: 2023,
    tags: ['node'],
    featured: false,
  },
]

describe('Route config', () => {
  it('exports a route config with head', () => {
    expect(routeModule.Route).toHaveProperty('head')
  })

  it('head returns correct meta tags', () => {
    const head = (
      routeModule.Route as unknown as { head: () => { meta: Array<unknown> } }
    ).head()

    expect(head).toHaveProperty('meta')
    expect(head.meta).toEqual(
      expect.arrayContaining([
        { title: 'Projects | BC Solutions' },
        {
          name: 'description',
          content:
            'Showcasing projects and work across different industries and technologies.',
        },
        { property: 'og:title', content: 'Projects | BC Solutions' },
        {
          property: 'og:description',
          content:
            'Showcasing projects and work across different industries and technologies.',
        },
        { property: 'og:url', content: 'https://bcordes.dev/projects' },
      ]),
    )
  })
})

describe('GET /projects/ loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns showcases from getShowcases()', () => {
    mockGetShowcases.mockReturnValue(fakeShowcases)

    const result = loader()

    expect(result).toEqual({ showcases: fakeShowcases })
  })

  it('calls getShowcases with no arguments', () => {
    mockGetShowcases.mockReturnValue([])

    loader()

    expect(mockGetShowcases).toHaveBeenCalledWith()
    expect(mockGetShowcases).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when getShowcases returns empty', () => {
    mockGetShowcases.mockReturnValue([])

    const result = loader()

    expect(result).toEqual({ showcases: [] })
  })
})
