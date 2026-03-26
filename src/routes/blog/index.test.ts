import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlogPost } from '@/lib/blog'
import { getBlogPosts } from '@/lib/blog.server'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

vi.mock('@/lib/blog.server', () => ({
  getBlogPosts: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
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
  Calendar: 'Calendar',
  Clock: 'Clock',
  Tag: 'Tag',
}))
vi.mock('@/components/shared/FadeInView', () => ({
  FadeInView: 'FadeInView',
}))
vi.mock('@/lib/blog', () => ({
  formatDate: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import route module after mocks
// ---------------------------------------------------------------------------

const routeModule = await import('./index')
const loader = (
  routeModule.Route as unknown as {
    loader: () => Promise<{ posts: Array<BlogPost> }>
  }
).loader

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const fakePosts: Array<BlogPost> = [
  {
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
  },
  {
    slug: 'second-post',
    frontmatter: {
      title: 'Second Post',
      date: '2026-02-20',
      excerpt: 'Another blog post',
      tags: ['tech'],
      published: true,
    },
    content: '# Second Post\n\nMore content here.',
    readTime: 3,
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('blog/index loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns posts from getBlogPosts', async () => {
    vi.mocked(getBlogPosts).mockResolvedValue(fakePosts)

    const result = await loader()

    expect(getBlogPosts).toHaveBeenCalledOnce()
    expect(result).toEqual({ posts: fakePosts })
  })

  it('returns empty array when no posts exist', async () => {
    vi.mocked(getBlogPosts).mockResolvedValue([])

    const result = await loader()

    expect(getBlogPosts).toHaveBeenCalledOnce()
    expect(result).toEqual({ posts: [] })
  })

  it('propagates errors from getBlogPosts', async () => {
    vi.mocked(getBlogPosts).mockRejectedValue(new Error('disk read failed'))

    await expect(loader()).rejects.toThrow('disk read failed')
  })
})
