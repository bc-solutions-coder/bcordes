import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { renderProjectRoute } from '../../../testing/render-project-route'
import { controlIntersections, controlMotion } from '../../../testing/motion'
import type { ShowcaseMeta } from '@/features/projects'
import type * as ProjectsModule from '@/features/projects'
import { getShowcases } from '@/features/projects'

vi.mock('@/features/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof ProjectsModule>()),
  getShowcases: vi.fn(),
}))
beforeEach(() => {
  controlMotion(true)
  controlIntersections()
  vi.stubGlobal('scrollTo', vi.fn())
})
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

describe('projects/index component', () => {
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the page heading and description', async () => {
    vi.mocked(getShowcases).mockReturnValue([])
    await renderProjectRoute()

    expect(screen.getByText('Projects')).toBeTruthy()
    expect(
      screen.getByText(/A selection of projects I have worked on/),
    ).toBeTruthy()
  })

  it('renders project cards with titles and descriptions', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    expect(screen.getByText('Project Alpha')).toBeTruthy()
    expect(screen.getByText('Project Beta')).toBeTruthy()
    expect(screen.getByText('Project Gamma')).toBeTruthy()
    expect(screen.getByText('Alpha description')).toBeTruthy()
    expect(screen.getByText('Beta description')).toBeTruthy()
  })

  it('links each project card to /projects/$slug', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    for (const [name, slug] of [
      ['Project Alpha', 'project-alpha'],
      ['Project Beta', 'project-beta'],
      ['Project Gamma', 'project-gamma'],
    ]) {
      expect(
        screen.getByRole('link', { name: new RegExp(name) }),
      ).toHaveAttribute('href', `/projects/${slug}`)
    }
    fireEvent.click(screen.getByRole('link', { name: /Project Alpha/ }))
    expect(
      await screen.findByRole('heading', { name: 'Project Alpha', level: 1 }),
    ).toBeInTheDocument()
  })

  it('displays correct result count', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    expect(screen.getByText(/Showing 3 of 3 projects/)).toBeTruthy()
  })

  it('does not show "Clear filters" button when no filters are active', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    expect(screen.queryByText('Clear filters')).toBeNull()
  })

  it('filters showcases by tag when a tag button is clicked', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    fireEvent.click(screen.getByRole('button', { name: 'python' }))

    expect(screen.getByText(/Showing 1 of 3 projects/)).toBeTruthy()
    expect(screen.getByText('Project Gamma')).toBeTruthy()
    expect(screen.queryByText('Project Alpha')).toBeNull()
    expect(screen.queryByText('Project Beta')).toBeNull()
  })

  it('filters showcases by year when a year button is clicked', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    fireEvent.click(screen.getByRole('button', { name: '2023' }))

    expect(screen.getByText(/Showing 1 of 3 projects/)).toBeTruthy()
    expect(screen.getByText('Project Beta')).toBeTruthy()
    expect(screen.queryByText('Project Alpha')).toBeNull()
  })

  it('shows "Clear filters" button when a tag filter is active', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    fireEvent.click(screen.getByRole('button', { name: 'react' }))

    expect(screen.getByText('Clear filters')).toBeTruthy()
  })

  it('restores all projects and clears both filters when Clear filters is clicked', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    fireEvent.click(screen.getByRole('button', { name: 'python' }))

    fireEvent.click(screen.getByRole('button', { name: '2024' }))
    expect(screen.getByText(/Showing 1 of 3 projects/)).toBeTruthy()

    fireEvent.click(screen.getByText('Clear filters'))

    expect(screen.getByText(/Showing 3 of 3 projects/)).toBeTruthy()
    expect(screen.queryByText('Clear filters')).toBeNull()
    for (const name of ['Project Alpha', 'Project Beta', 'Project Gamma'])
      expect(
        screen.getByRole('link', { name: new RegExp(name) }),
      ).toBeInTheDocument()
    expect(screen.queryByText('No projects found')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument()
  })

  it('renders empty state when no showcases match filters', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    fireEvent.click(screen.getByRole('button', { name: 'python' }))

    fireEvent.click(screen.getByRole('button', { name: '2023' }))

    expect(screen.getByText('No projects found')).toBeTruthy()
    expect(
      screen.getByText('Try adjusting your filters to see more results.'),
    ).toBeTruthy()
  })

  it('restores all projects and clears both filters when Clear all filters is clicked', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    fireEvent.click(screen.getByRole('button', { name: 'python' }))

    fireEvent.click(screen.getByRole('button', { name: '2023' }))

    expect(screen.getByText('No projects found')).toBeTruthy()

    fireEvent.click(screen.getByText('Clear all filters'))

    expect(screen.getByText(/Showing 3 of 3 projects/)).toBeTruthy()
    for (const name of ['Project Alpha', 'Project Beta', 'Project Gamma'])
      expect(
        screen.getByRole('link', { name: new RegExp(name) }),
      ).toBeInTheDocument()
    expect(screen.queryByText('No projects found')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument()
  })

  it('renders filter sections for tags and years', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    expect(screen.getByText('Filter by Technology')).toBeTruthy()
    expect(screen.getByText('Filter by Year')).toBeTruthy()
  })

  it('combines tag and year filters', async () => {
    vi.mocked(getShowcases).mockReturnValue(fakeShowcases)
    await renderProjectRoute()

    fireEvent.click(screen.getByRole('button', { name: 'typescript' }))

    expect(screen.getByText(/Showing 2 of 3 projects/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '2024' }))

    expect(screen.getByText(/Showing 1 of 3 projects/)).toBeTruthy()
    expect(screen.getByText('Project Alpha')).toBeTruthy()
    expect(screen.queryByText('Project Beta')).toBeNull()
  })

  it('renders empty list when showcases array is empty', async () => {
    vi.mocked(getShowcases).mockReturnValue([])
    await renderProjectRoute()

    expect(screen.getByText(/Showing 0 of 0 projects/)).toBeTruthy()
  })
})
