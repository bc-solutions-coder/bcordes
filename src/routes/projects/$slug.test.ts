import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShowcaseMeta } from '@/content/projects'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const mockGetShowcases = vi.fn()
const mockNotFound = vi.fn()

vi.mock('@/content/projects', () => ({
  getShowcases: mockGetShowcases,
  getShowcaseContent: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
  notFound: mockNotFound,
  Link: 'a',
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => null,
}))

// ---------------------------------------------------------------------------
// Import route module after mocks
// ---------------------------------------------------------------------------

const routeModule = await import('./$slug')
const loader = (
  routeModule.Route as unknown as {
    loader: (ctx: { params: { slug: string } }) => { showcase: ShowcaseMeta }
  }
).loader

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Head helper
// ---------------------------------------------------------------------------

const head = (
  routeModule.Route as unknown as {
    head: (ctx: { loaderData: { showcase: ShowcaseMeta } }) => {
      meta: Array<Record<string, string>>
    }
  }
).head

describe('Route config', () => {
  it('exports a route config with head', () => {
    expect(routeModule.Route).toHaveProperty('head')
  })

  it('head returns correct meta tags for a showcase', () => {
    const showcase = fakeShowcases[0]
    const result = head({ loaderData: { showcase } })

    expect(result).toHaveProperty('meta')
    expect(result.meta).toEqual(
      expect.arrayContaining([
        { title: 'Project A | BC Solutions' },
        { name: 'description', content: 'Description A' },
        { property: 'og:title', content: 'Project A | BC Solutions' },
        { property: 'og:description', content: 'Description A' },
        {
          property: 'og:url',
          content: 'https://bcordes.dev/projects/project-a',
        },
      ]),
    )
  })

  it('head includes og:image when showcase has an image', () => {
    const showcase: ShowcaseMeta = {
      ...fakeShowcases[0],
      image: '/images/project-a.png',
    }
    const result = head({ loaderData: { showcase } })

    expect(result.meta).toEqual(
      expect.arrayContaining([
        { property: 'og:image', content: '/images/project-a.png' },
      ]),
    )
  })

  it('head omits og:image when showcase has no image', () => {
    const showcase = fakeShowcases[0]
    const result = head({ loaderData: { showcase } })

    const ogImage = result.meta.find(
      (m: Record<string, string>) => m.property === 'og:image',
    )
    expect(ogImage).toBeUndefined()
  })
})

describe('GET /projects/$slug loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotFound.mockReturnValue(new Error('Not Found'))
  })

  it('returns the matching showcase when slug matches', () => {
    mockGetShowcases.mockReturnValue(fakeShowcases)

    const result = loader({ params: { slug: 'project-a' } })

    expect(result).toEqual({ showcase: fakeShowcases[0] })
  })

  it('returns second showcase when its slug matches', () => {
    mockGetShowcases.mockReturnValue(fakeShowcases)

    const result = loader({ params: { slug: 'project-b' } })

    expect(result).toEqual({ showcase: fakeShowcases[1] })
  })

  it('throws notFound() when slug does not match any showcase', () => {
    mockGetShowcases.mockReturnValue(fakeShowcases)

    expect(() => loader({ params: { slug: 'nonexistent' } })).toThrow()
    expect(mockNotFound).toHaveBeenCalledTimes(1)
  })

  it('throws notFound() when showcases array is empty', () => {
    mockGetShowcases.mockReturnValue([])

    expect(() => loader({ params: { slug: 'project-a' } })).toThrow()
    expect(mockNotFound).toHaveBeenCalledTimes(1)
  })

  it('uses params.slug for the lookup', () => {
    mockGetShowcases.mockReturnValue(fakeShowcases)

    const result = loader({ params: { slug: 'project-b' } })

    expect(result.showcase.slug).toBe('project-b')
  })
})
