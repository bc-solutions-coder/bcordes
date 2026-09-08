import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderProjectRoute } from '../../../testing/render-project-route'
import { controlIntersections, controlMotion } from '../../../testing/motion'
import type { ShowcaseMeta } from '@/features/projects'
import type * as ProjectsModule from '@/features/projects'
import { getShowcases } from '@/features/projects'

vi.mock('@/features/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof ProjectsModule>()),
  getShowcases: vi.fn(),
}))
const projects: Array<ShowcaseMeta> = [
  {
    slug: 'project-a',
    title: 'Project A',
    description: 'Description A',
    client: 'Client A',
    year: 2024,
    tags: ['React', 'TypeScript'],
    featured: true,
  },
  {
    slug: 'project-b',
    title: 'Project B',
    description: 'Description B',
    client: 'Client B',
    year: 2023,
    tags: ['Node'],
    featured: false,
  },
]
beforeEach(() => {
  vi.mocked(getShowcases).mockReturnValue(projects)
  controlMotion(true)
  controlIntersections()
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function meta(property: string) {
  return document
    .querySelector(`meta[property="${property}"]`)
    ?.getAttribute('content')
}

describe('Project page metadata', () => {
  it('has no project metadata when the loader did not find a project', async () => {
    await renderProjectRoute('/projects/missing')
    expect(
      screen.getByRole('heading', { name: 'Project Not Found' }),
    ).toBeInTheDocument()
    expect(meta('og:title')).toBeUndefined()
    expect(meta('og:url')).toBeUndefined()
  })
  it('provides project title, description and canonical Open Graph URL', async () => {
    await renderProjectRoute('/projects/project-a')
    expect(document.title).toBe('Project A | BC Solutions')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Description A',
    )
    expect(meta('og:title')).toBe('Project A | BC Solutions')
    expect(meta('og:description')).toBe('Description A')
    expect(meta('og:url')).toBe('https://bcordes.dev/projects/project-a')
  })
  it('publishes an Open Graph image when the project has an image', async () => {
    vi.mocked(getShowcases).mockReturnValue([
      { ...projects[0], image: '/images/project-a.png' },
    ])
    await renderProjectRoute('/projects/project-a')
    expect(meta('og:image')).toBe('/images/project-a.png')
  })
  it('omits the Open Graph image when the project has no image', async () => {
    await renderProjectRoute('/projects/project-a')
    expect(meta('og:image')).toBeUndefined()
  })
})

describe('Project page loading', () => {
  it('loads Project A when its slug matches', async () => {
    await renderProjectRoute('/projects/project-a')
    expect(
      screen.getByRole('heading', { name: 'Project A', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Description A')).toBeInTheDocument()
    expect(screen.queryByText('Description B')).not.toBeInTheDocument()
  })
  it('loads Project B when its slug matches', async () => {
    await renderProjectRoute('/projects/project-b')
    expect(
      screen.getByRole('heading', { name: 'Project B', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Description B')).toBeInTheDocument()
    expect(screen.queryByText('Description A')).not.toBeInTheDocument()
  })
  it('shows project-not-found for an unknown slug', async () => {
    await renderProjectRoute('/projects/missing')
    expect(
      screen.getByRole('heading', { name: 'Project Not Found', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to Projects' }),
    ).toHaveAttribute('href', '/projects')
  })
  it('shows project-not-found when the catalog is empty', async () => {
    vi.mocked(getShowcases).mockReturnValue([])
    await renderProjectRoute('/projects/project-a')
    expect(
      screen.getByRole('heading', { name: 'Project Not Found', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to Projects' }),
    ).toHaveAttribute('href', '/projects')
  })
})
