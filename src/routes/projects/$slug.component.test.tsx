import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { ShowcaseMeta } from '@/content/projects'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const useLoaderDataMock = vi.fn()
const mockGetShowcaseContent = vi.fn()

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

vi.mock('@/components/shared/FadeInView', () => ({
  FadeInView: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('@/content/projects', () => ({
  getShowcases: vi.fn(),
  getShowcaseContent: (...args: Array<unknown>) =>
    mockGetShowcaseContent(...args),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
}))

// ---------------------------------------------------------------------------
// Import the route module (must come after mocks)
// ---------------------------------------------------------------------------

const routeModule = await import('./$slug')

const routeConfig = routeModule.Route as unknown as {
  component: React.ComponentType
  notFoundComponent: React.ComponentType
}

const ShowcaseDetailPage = routeConfig.component
const NotFoundComponent = routeConfig.notFoundComponent

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const fakeShowcase: ShowcaseMeta = {
  slug: 'project-alpha',
  title: 'Project Alpha',
  description: 'A wonderful project about alpha things',
  client: 'Client A',
  year: 2024,
  tags: ['react', 'typescript', 'tailwind'],
  featured: true,
}

const fakeShowcaseWithImage: ShowcaseMeta = {
  ...fakeShowcase,
  slug: 'project-with-image',
  title: 'Project With Image',
  image: '/images/project-alpha.png',
}

// ---------------------------------------------------------------------------
// Tests — ShowcaseDetailPage component
// ---------------------------------------------------------------------------

describe('projects/$slug component', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the project title', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => <p>Content here</p>)
    render(<ShowcaseDetailPage />)

    expect(screen.getByText('Project Alpha')).toBeTruthy()
  })

  it('renders the project description', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => <p>Content here</p>)
    render(<ShowcaseDetailPage />)

    expect(
      screen.getByText('A wonderful project about alpha things'),
    ).toBeTruthy()
  })

  it('renders the project year', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => <p>Content here</p>)
    render(<ShowcaseDetailPage />)

    expect(screen.getByText('2024')).toBeTruthy()
  })

  it('renders all tags as badges', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => <p>Content here</p>)
    render(<ShowcaseDetailPage />)

    expect(screen.getByText('react')).toBeTruthy()
    expect(screen.getByText('typescript')).toBeTruthy()
    expect(screen.getByText('tailwind')).toBeTruthy()
  })

  it('renders the MDX content component', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => (
      <p data-testid="mdx-content">MDX project content</p>
    ))
    render(<ShowcaseDetailPage />)

    expect(screen.getByTestId('mdx-content')).toBeTruthy()
    expect(screen.getByText('MDX project content')).toBeTruthy()
  })

  it('renders nothing in content area when getShowcaseContent returns undefined', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(undefined)
    render(<ShowcaseDetailPage />)

    // Title should still render
    expect(screen.getByText('Project Alpha')).toBeTruthy()
    // No content section crash
  })

  it('renders a "Back to Projects" link in the header', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => null)
    render(<ShowcaseDetailPage />)

    const backLinks = screen.getAllByText('Back to Projects')
    expect(backLinks.length).toBeGreaterThanOrEqual(1)
    expect(backLinks[0].closest('a')?.getAttribute('href')).toBe('/projects')
  })

  it('renders a "Back to all projects" link in the footer', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => null)
    render(<ShowcaseDetailPage />)

    const footerLink = screen.getByText('Back to all projects')
    expect(footerLink.closest('a')?.getAttribute('href')).toBe('/projects')
  })

  it('renders the project image when showcase has an image', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcaseWithImage })
    mockGetShowcaseContent.mockReturnValue(() => null)
    render(<ShowcaseDetailPage />)

    const img = screen.getByAltText('Project With Image')
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/images/project-alpha.png')
  })

  it('does not render an image when showcase has no image', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => null)
    render(<ShowcaseDetailPage />)

    expect(screen.queryByRole('img')).toBeNull()
  })

  it('calls getShowcaseContent with the showcase slug', () => {
    useLoaderDataMock.mockReturnValue({ showcase: fakeShowcase })
    mockGetShowcaseContent.mockReturnValue(() => null)
    render(<ShowcaseDetailPage />)

    expect(mockGetShowcaseContent).toHaveBeenCalledWith('project-alpha')
  })
})

// ---------------------------------------------------------------------------
// Tests — notFoundComponent
// ---------------------------------------------------------------------------

describe('projects/$slug notFoundComponent', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders "Project Not Found" heading', () => {
    render(<NotFoundComponent />)

    expect(screen.getByText('Project Not Found')).toBeTruthy()
  })

  it('renders descriptive message', () => {
    render(<NotFoundComponent />)

    expect(
      screen.getByText('The project you are looking for does not exist.'),
    ).toBeTruthy()
  })

  it('renders a link back to /projects', () => {
    render(<NotFoundComponent />)

    const link = screen.getByText('Back to Projects')
    expect(link.closest('a')?.getAttribute('href')).toBe('/projects')
  })

  it('renders the ArrowLeft icon', () => {
    render(<NotFoundComponent />)

    expect(screen.getByTestId('arrow-left-icon')).toBeTruthy()
  })
})
