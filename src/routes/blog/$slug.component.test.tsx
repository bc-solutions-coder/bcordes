import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const useLoaderDataMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: Record<string, unknown>) => ({
    ...routeConfig,
    useLoaderData: useLoaderDataMock,
  }),
  notFound: vi.fn(),
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
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

vi.mock('@/components/shared/MarkdownContent', () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}))

vi.mock('@/lib/blog.server', () => ({
  getBlogPostBySlug: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import the route module (must come after mocks)
// ---------------------------------------------------------------------------

const routeModule = await import('./$slug')

const routeConfig = routeModule.Route as unknown as {
  component: React.ComponentType
  notFoundComponent: React.ComponentType
}

const BlogPostPage = routeConfig.component
const NotFoundComponent = routeConfig.notFoundComponent

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const fakePost = {
  slug: 'hello-world',
  frontmatter: {
    title: 'Hello World',
    date: '2026-01-15',
    excerpt: 'My first blog post',
    tags: ['intro', 'general'],
    published: true,
  },
  content: '# Hello World\n\nThis is my first post.',
  readTime: 3,
}

// ---------------------------------------------------------------------------
// Tests — BlogPostPage component
// ---------------------------------------------------------------------------

describe('blog/$slug component', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the post title', () => {
    useLoaderDataMock.mockReturnValue({ post: fakePost })
    render(<BlogPostPage />)

    expect(screen.getByText('Hello World')).toBeTruthy()
  })

  it('renders the read time', () => {
    useLoaderDataMock.mockReturnValue({ post: fakePost })
    render(<BlogPostPage />)

    expect(screen.getByText('3 min read')).toBeTruthy()
  })

  it('renders all tags', () => {
    useLoaderDataMock.mockReturnValue({ post: fakePost })
    render(<BlogPostPage />)

    expect(screen.getByText('intro')).toBeTruthy()
    expect(screen.getByText('general')).toBeTruthy()
  })

  it('renders the MarkdownContent with post content', () => {
    useLoaderDataMock.mockReturnValue({ post: fakePost })
    render(<BlogPostPage />)

    const md = screen.getByTestId('markdown-content')
    expect(md.textContent).toBe(fakePost.content)
  })

  it('renders a "Back to Blog" link in the header', () => {
    useLoaderDataMock.mockReturnValue({ post: fakePost })
    render(<BlogPostPage />)

    const backLinks = screen.getAllByText('Back to Blog')
    expect(backLinks.length).toBeGreaterThanOrEqual(1)
    expect(backLinks[0].closest('a')?.getAttribute('href')).toBe('/blog')
  })

  it('renders a "Back to all posts" link in the footer', () => {
    useLoaderDataMock.mockReturnValue({ post: fakePost })
    render(<BlogPostPage />)

    const footerLink = screen.getByText('Back to all posts')
    expect(footerLink.closest('a')?.getAttribute('href')).toBe('/blog')
  })
})

// ---------------------------------------------------------------------------
// Tests — notFoundComponent
// ---------------------------------------------------------------------------

describe('blog/$slug notFoundComponent', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders "Post Not Found" heading', () => {
    render(<NotFoundComponent />)

    expect(screen.getByText('Post Not Found')).toBeTruthy()
  })

  it('renders descriptive message', () => {
    render(<NotFoundComponent />)

    expect(
      screen.getByText("The blog post you're looking for doesn't exist."),
    ).toBeTruthy()
  })

  it('renders a link back to /blog', () => {
    render(<NotFoundComponent />)

    const link = screen.getByText('Back to Blog')
    expect(link.closest('a')?.getAttribute('href')).toBe('/blog')
  })
})
