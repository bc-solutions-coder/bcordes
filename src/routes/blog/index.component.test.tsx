import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { BlogPost } from '@/lib/blog'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const useLoaderDataMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: Record<string, unknown>) => ({
    ...routeConfig,
    useLoaderData: useLoaderDataMock,
  }),
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
    [key: string]: unknown
  }) => {
    const href = params
      ? to.replace(/\$(\w+)/g, (_, key: string) => params[key] ?? '')
      : to
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  },
}))

vi.mock('@tanstack/react-start', () => {
  const createServerFn = () => {
    const chain = {
      inputValidator: () => chain,
      handler: () => {
        const callable = () => {}
        callable.handler = () => {}
        callable.inputValidator = () => chain
        return callable
      },
    }
    return chain
  }
  return { createServerFn }
})

vi.mock('@/components/shared/FadeInView', () => ({
  FadeInView: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('@/lib/blog.server', () => ({
  getBlogPosts: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import the route module (must come after mocks)
// ---------------------------------------------------------------------------

const routeModule = await import('./index')

const BlogIndex = (
  routeModule.Route as unknown as { component: React.ComponentType }
).component

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
    content: '# Hello World',
    readTime: 1,
  },
  {
    slug: 'advanced-patterns',
    frontmatter: {
      title: 'Advanced Patterns',
      date: '2026-02-20',
      excerpt: 'Deep dive into patterns',
      tags: ['react', 'typescript', 'architecture', 'patterns'],
      published: true,
    },
    content: '# Advanced Patterns',
    readTime: 7,
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('blog/index component', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the page heading and description', () => {
    useLoaderDataMock.mockReturnValue({ posts: [] })
    render(<BlogIndex />)

    expect(screen.getByText('Blog')).toBeTruthy()
    expect(screen.getByText(/Thoughts on software engineering/)).toBeTruthy()
  })

  it('renders "No blog posts yet" when posts array is empty', () => {
    useLoaderDataMock.mockReturnValue({ posts: [] })
    render(<BlogIndex />)

    expect(screen.getByText('No blog posts yet. Check back soon!')).toBeTruthy()
  })

  it('renders blog post cards with titles', () => {
    useLoaderDataMock.mockReturnValue({ posts: fakePosts })
    render(<BlogIndex />)

    expect(screen.getByText('Hello World')).toBeTruthy()
    expect(screen.getByText('Advanced Patterns')).toBeTruthy()
  })

  it('renders excerpts for each post', () => {
    useLoaderDataMock.mockReturnValue({ posts: fakePosts })
    render(<BlogIndex />)

    expect(screen.getByText('My first blog post')).toBeTruthy()
    expect(screen.getByText('Deep dive into patterns')).toBeTruthy()
  })

  it('renders read time for each post', () => {
    useLoaderDataMock.mockReturnValue({ posts: fakePosts })
    render(<BlogIndex />)

    expect(screen.getByText('1 min read')).toBeTruthy()
    expect(screen.getByText('7 min read')).toBeTruthy()
  })

  it('links each card to the correct /blog/$slug path', () => {
    useLoaderDataMock.mockReturnValue({ posts: fakePosts })
    render(<BlogIndex />)

    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))

    expect(hrefs).toContain('/blog/hello-world')
    expect(hrefs).toContain('/blog/advanced-patterns')
  })

  it('truncates tags to the first 3', () => {
    useLoaderDataMock.mockReturnValue({ posts: fakePosts })
    render(<BlogIndex />)

    // The second post has 4 tags; only the first 3 should render
    expect(screen.getByText('react')).toBeTruthy()
    expect(screen.getByText('typescript')).toBeTruthy()
    expect(screen.getByText('architecture')).toBeTruthy()
    expect(screen.queryByText('patterns')).toBeNull()
  })

  it('does not render empty-state message when posts exist', () => {
    useLoaderDataMock.mockReturnValue({ posts: fakePosts })
    render(<BlogIndex />)

    expect(screen.queryByText('No blog posts yet. Check back soon!')).toBeNull()
  })
})
