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
