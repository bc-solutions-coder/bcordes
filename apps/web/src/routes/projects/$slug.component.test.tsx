import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { renderProjectRoute } from '../../../testing/render-project-route'
import { controlIntersections, controlMotion } from '../../../testing/motion'
import type { ShowcaseMeta } from '@/features/projects'
import type * as ProjectsModule from '@/features/projects'
import { getShowcases } from '@/features/projects'

vi.mock('@/features/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof ProjectsModule>()
  return { ...actual, getShowcases: vi.fn(actual.getShowcases) }
})
const actual = await vi.importActual<typeof ProjectsModule>(
  '@/features/projects',
)
const withoutBody: ShowcaseMeta = {
  slug: 'sample',
  title: 'Sample project',
  description: 'A project with no published body.',
  client: 'Sample client',
  year: 2024,
  tags: ['React'],
  featured: false,
}

beforeEach(() => {
  vi.mocked(getShowcases).mockReset().mockImplementation(actual.getShowcases)
  controlMotion(true)
  controlIntersections()
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function followBack(name: string) {
  const link = screen.getByRole('link', { name })
  expect(link).toHaveAttribute('href', '/projects')
  fireEvent.click(link)
  expect(
    await screen.findByRole('heading', { name: 'Projects', level: 1 }),
  ).toBeInTheDocument()
}

describe('Project details', () => {
  it('renders the project title', async () => {
    await renderProjectRoute('/projects/bcordes')
    expect(
      screen.getByRole('heading', { name: 'Bcordes', level: 1 }),
    ).toBeInTheDocument()
  })
  it('renders the project description', async () => {
    await renderProjectRoute('/projects/bcordes')
    expect(
      screen.getByText(
        /A professional portfolio and contact site built with TanStack Start/,
      ),
    ).toBeInTheDocument()
  })
  it('renders the project year', async () => {
    await renderProjectRoute('/projects/bcordes')
    expect(screen.getByText('2025')).toBeInTheDocument()
  })
  it('shows every project technology tag', async () => {
    await renderProjectRoute('/projects/bcordes')
    for (const tag of [
      'React',
      'TypeScript',
      'TanStack Start',
      'Tailwind CSS',
      'Docker',
    ])
      expect(screen.getByText(tag)).toBeInTheDocument()
  })
  it.each([
    {
      slug: 'bcordes',
      body: /full-stack portfolio site/i,
      other: /modular, multi-tenant SaaS backend/i,
    },
    {
      slug: 'wallow',
      body: /modular, multi-tenant SaaS backend/i,
      other: /full-stack portfolio site/i,
    },
  ])(
    'shows the body belonging to the loaded $slug project',
    async ({ slug, body, other }) => {
      await renderProjectRoute(`/projects/${slug}`)
      expect(screen.getByText(body)).toBeInTheDocument()
      expect(screen.queryByText(other)).not.toBeInTheDocument()
    },
  )
  it.each(['Back to Projects', 'Back to all projects'])(
    'keeps project details and usable %s navigation when the body is unavailable',
    async (name) => {
      vi.mocked(getShowcases).mockReturnValue([withoutBody])
      await renderProjectRoute('/projects/sample')
      expect(
        screen.getByRole('heading', { name: 'Sample project', level: 1 }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('A project with no published body.'),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: 'Overview' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: 'Architecture' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(
          /full-stack portfolio site|modular, multi-tenant SaaS backend/i,
        ),
      ).not.toBeInTheDocument()
      await followBack(name)
    },
  )
  it('renders a "Back to Projects" link in the header', async () => {
    await renderProjectRoute('/projects/bcordes')
    await followBack('Back to Projects')
  })
  it('renders a "Back to all projects" link in the footer', async () => {
    await renderProjectRoute('/projects/bcordes')
    await followBack('Back to all projects')
  })
  it('renders the project image when showcase has an image', async () => {
    await renderProjectRoute('/projects/bcordes')
    expect(screen.getByRole('img', { name: 'Bcordes' })).toHaveAttribute(
      'src',
      '/images/projects/bcordes.svg',
    )
  })
  it('does not render an image when showcase has no image', async () => {
    vi.mocked(getShowcases).mockReturnValue([withoutBody])
    await renderProjectRoute('/projects/sample')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('Unknown project', () => {
  it('renders "Project Not Found" heading', async () => {
    await renderProjectRoute('/projects/missing')
    expect(
      screen.getByRole('heading', { name: 'Project Not Found', level: 1 }),
    ).toBeInTheDocument()
  })
  it('renders descriptive message', async () => {
    await renderProjectRoute('/projects/missing')
    expect(
      screen.getByText('The project you are looking for does not exist.'),
    ).toBeInTheDocument()
  })
  it('renders a link back to /projects', async () => {
    await renderProjectRoute('/projects/missing')
    await followBack('Back to Projects')
  })
})
