import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { ShowcaseMeta } from '@/content/projects'

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

vi.mock('@/components/shared/FadeInView', () => ({
  FadeInView: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('@/content/projects', () => ({
  getShowcases: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import the route module (must come after mocks)
// ---------------------------------------------------------------------------

const routeModule = await import('./index')

const ProjectsIndex = (
  routeModule.Route as unknown as { component: React.ComponentType }
).component

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const fakeShowcases: Array<ShowcaseMeta> = [
  {
    slug: 'project-alpha',
    title: 'Project Alpha',
    description: 'Alpha description',
    client: 'Client A',
    year: 2024,
    tags: ['react', 'typescript'],
    featured: true,
  },
  {
    slug: 'project-beta',
    title: 'Project Beta',
    description: 'Beta description',
    client: 'Client B',
    year: 2023,
    tags: ['node', 'typescript'],
    featured: false,
  },
  {
    slug: 'project-gamma',
    title: 'Project Gamma',
    description: 'Gamma description',
    client: 'Client C',
    year: 2024,
    tags: ['python'],
    featured: false,
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('projects/index component', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the page heading and description', () => {
    useLoaderDataMock.mockReturnValue({ showcases: [] })
    render(<ProjectsIndex />)

    expect(screen.getByText('Projects')).toBeTruthy()
    expect(
      screen.getByText(/A selection of projects I have worked on/),
    ).toBeTruthy()
  })

  it('renders project cards with titles and descriptions', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    expect(screen.getByText('Project Alpha')).toBeTruthy()
    expect(screen.getByText('Project Beta')).toBeTruthy()
    expect(screen.getByText('Project Gamma')).toBeTruthy()
    expect(screen.getByText('Alpha description')).toBeTruthy()
    expect(screen.getByText('Beta description')).toBeTruthy()
  })

  it('links each project card to /projects/$slug', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))

    expect(hrefs).toContain('/projects/project-alpha')
    expect(hrefs).toContain('/projects/project-beta')
    expect(hrefs).toContain('/projects/project-gamma')
  })

  it('displays correct result count', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    expect(screen.getByText(/Showing 3 of 3 projects/)).toBeTruthy()
  })

  it('does not show "Clear filters" button when no filters are active', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    expect(screen.queryByText('Clear filters')).toBeNull()
  })

  it('filters showcases by tag when a tag button is clicked', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    // Click the "python" tag filter button
    const pythonButtons = screen.getAllByText('python')
    // The filter button is the one inside a <button> element
    const filterButton = pythonButtons.find((el) => el.closest('button'))
    fireEvent.click(filterButton!)

    // Only Project Gamma has the "python" tag
    expect(screen.getByText(/Showing 1 of 3 projects/)).toBeTruthy()
    expect(screen.getByText('Project Gamma')).toBeTruthy()
    expect(screen.queryByText('Project Alpha')).toBeNull()
    expect(screen.queryByText('Project Beta')).toBeNull()
  })

  it('filters showcases by year when a year button is clicked', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    // Click the "2023" year filter button
    const yearButtons = screen.getAllByText('2023')
    const filterButton = yearButtons.find((el) => el.closest('button'))
    fireEvent.click(filterButton!)

    // Only Project Beta is from 2023
    expect(screen.getByText(/Showing 1 of 3 projects/)).toBeTruthy()
    expect(screen.getByText('Project Beta')).toBeTruthy()
    expect(screen.queryByText('Project Alpha')).toBeNull()
  })

  it('shows "Clear filters" button when a tag filter is active', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    // Click a tag filter
    const reactButtons = screen.getAllByText('react')
    const filterButton = reactButtons.find((el) => el.closest('button'))
    fireEvent.click(filterButton!)

    expect(screen.getByText('Clear filters')).toBeTruthy()
  })

  it('resets filters when "Clear filters" is clicked', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    // Apply a tag filter
    const pythonButtons = screen.getAllByText('python')
    const filterButton = pythonButtons.find((el) => el.closest('button'))
    fireEvent.click(filterButton!)

    expect(screen.getByText(/Showing 1 of 3 projects/)).toBeTruthy()

    // Click "Clear filters"
    fireEvent.click(screen.getByText('Clear filters'))

    // All projects should be visible again
    expect(screen.getByText(/Showing 3 of 3 projects/)).toBeTruthy()
    expect(screen.queryByText('Clear filters')).toBeNull()
  })

  it('renders empty state when no showcases match filters', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    // Apply tag filter for python, then year filter for 2023 (no project matches both)
    const pythonButtons = screen.getAllByText('python')
    const tagButton = pythonButtons.find((el) => el.closest('button'))
    fireEvent.click(tagButton!)

    const yearButtons = screen.getAllByText('2023')
    const yearButton = yearButtons.find((el) => el.closest('button'))
    fireEvent.click(yearButton!)

    expect(screen.getByText('No projects found')).toBeTruthy()
    expect(
      screen.getByText('Try adjusting your filters to see more results.'),
    ).toBeTruthy()
  })

  it('renders "Clear all filters" button in empty state and resets on click', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    // Create a no-match scenario
    const pythonButtons = screen.getAllByText('python')
    const tagButton = pythonButtons.find((el) => el.closest('button'))
    fireEvent.click(tagButton!)

    const yearButtons = screen.getAllByText('2023')
    const yearButton = yearButtons.find((el) => el.closest('button'))
    fireEvent.click(yearButton!)

    expect(screen.getByText('No projects found')).toBeTruthy()

    // Click "Clear all filters" in the empty state
    fireEvent.click(screen.getByText('Clear all filters'))

    // All projects visible again
    expect(screen.getByText(/Showing 3 of 3 projects/)).toBeTruthy()
  })

  it('renders filter sections for tags and years', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    expect(screen.getByText('Filter by Technology')).toBeTruthy()
    expect(screen.getByText('Filter by Year')).toBeTruthy()
  })

  it('combines tag and year filters', () => {
    useLoaderDataMock.mockReturnValue({ showcases: fakeShowcases })
    render(<ProjectsIndex />)

    // Filter by typescript tag
    const tsButtons = screen.getAllByText('typescript')
    const tagButton = tsButtons.find((el) => el.closest('button'))
    fireEvent.click(tagButton!)

    // Both Alpha (2024) and Beta (2023) have typescript
    expect(screen.getByText(/Showing 2 of 3 projects/)).toBeTruthy()

    // Now also filter by year 2024
    const yearButtons = screen.getAllByText('2024')
    const yearButton = yearButtons.find((el) => el.closest('button'))
    fireEvent.click(yearButton!)

    // Only Alpha matches both
    expect(screen.getByText(/Showing 1 of 3 projects/)).toBeTruthy()
    expect(screen.getByText('Project Alpha')).toBeTruthy()
    expect(screen.queryByText('Project Beta')).toBeNull()
  })

  it('renders empty list when showcases array is empty', () => {
    useLoaderDataMock.mockReturnValue({ showcases: [] })
    render(<ProjectsIndex />)

    expect(screen.getByText(/Showing 0 of 0 projects/)).toBeTruthy()
  })
})
