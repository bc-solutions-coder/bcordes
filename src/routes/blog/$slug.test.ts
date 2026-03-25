import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlogPost } from '@/lib/blog'
import { getBlogPostBySlug } from '@/lib/blog.server'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

vi.mock('@/lib/blog.server', () => ({
  getBlogPostBySlug: vi.fn(),
}))

const notFoundMock = vi.fn(() => {
  throw new Error('NOT_FOUND')
})

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
  notFound: notFoundMock,
}))

vi.mock('@tanstack/react-start', () => {
  const createServerFn = () => {
    let handlerFn: (...args: Array<unknown>) => unknown
    const chain = {
      inputValidator: () => chain,
      handler: (fn: (...args: Array<unknown>) => unknown) => {
        handlerFn = fn
        const callable = (...args: Array<unknown>) => handlerFn(...args)
        callable.handler = handlerFn
        callable.inputValidator = () => chain
        return callable
      },
    }
    return chain
  }
  return { createServerFn }
})

// Mock component dependencies to avoid JSX/React issues
vi.mock('lucide-react', () => ({
  ArrowLeft: 'ArrowLeft',
  Calendar: 'Calendar',
  Clock: 'Clock',
  Tag: 'Tag',
}))
vi.mock('@/components/shared/FadeInView', () => ({
  FadeInView: 'FadeInView',
}))
vi.mock('@/components/shared/MarkdownContent', () => ({
  MarkdownContent: 'MarkdownContent',
}))
vi.mock('@/lib/blog', () => ({
  formatDate: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import route module after mocks
// ---------------------------------------------------------------------------

const routeModule = await import('./$slug')
const loader = (
  routeModule.Route as unknown as {
    loader: (ctx: { params: { slug: string } }) => Promise<{ post: BlogPost }>
  }
).loader

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const fakePost: BlogPost = {
  slug: 'hello-world',
  frontmatter: {
    title: 'Hello World',
    date: '2026-01-15',
    excerpt: 'My first blog post',
    tags: ['intro', 'general'],
    published: true,
  },
  content: '# Hello World\n\nThis is my first post.',
  readTime: 1,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('blog/$slug loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns post when getBlogPostBySlug resolves with a post', async () => {
    vi.mocked(getBlogPostBySlug).mockResolvedValue(fakePost)

    const result = await loader({ params: { slug: 'hello-world' } })

    expect(getBlogPostBySlug).toHaveBeenCalledWith('hello-world')
    expect(result).toEqual({ post: fakePost })
  })

  it('passes the slug param to getBlogPostBySlug', async () => {
    vi.mocked(getBlogPostBySlug).mockResolvedValue(fakePost)

    await loader({ params: { slug: 'some-other-slug' } })

    expect(getBlogPostBySlug).toHaveBeenCalledWith('some-other-slug')
  })

  it('calls notFound() when getBlogPostBySlug returns null', async () => {
    vi.mocked(getBlogPostBySlug).mockResolvedValue(null)

    await expect(loader({ params: { slug: 'nonexistent' } })).rejects.toThrow()

    expect(notFoundMock).toHaveBeenCalledOnce()
  })

  it('propagates errors from getBlogPostBySlug', async () => {
    vi.mocked(getBlogPostBySlug).mockRejectedValue(
      new Error('disk read failed'),
    )

    await expect(loader({ params: { slug: 'hello-world' } })).rejects.toThrow(
      'disk read failed',
    )
  })
})
