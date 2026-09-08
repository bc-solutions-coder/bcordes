import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderRoute } from '../../../../testing/render-route'
import { ProjectCard } from './ProjectCard'
import type { ShowcaseMeta } from '../content'

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function makeShowcase(overrides: Partial<ShowcaseMeta> = {}): ShowcaseMeta {
  return {
    slug: 'test-project',
    title: 'Test Project',
    description: 'A test project description',
    client: 'Test Client',
    year: 2025,
    tags: ['React', 'TypeScript'],
    featured: false,
    ...overrides,
  }
}

describe('ProjectCard', () => {
  it('renders title, year, and description', async () => {
    await renderRoute(<ProjectCard showcase={makeShowcase()} />)

    expect(screen.getByText('Test Project')).toBeDefined()
    expect(screen.getByText('2025')).toBeDefined()
    expect(screen.getByText('A test project description')).toBeDefined()
  })

  it('links the project title to its detail route', async () => {
    await renderRoute(
      <ProjectCard showcase={makeShowcase({ slug: 'my-app' })} />,
    )

    const link = screen.getByRole('link', { name: /Test Project/ })
    expect(link.getAttribute('href')).toBe('/projects/my-app')
  })

  it('shows each tag when fewer than four are provided', async () => {
    await renderRoute(
      <ProjectCard
        showcase={makeShowcase({ tags: ['React', 'TypeScript'] })}
      />,
    )

    expect(screen.getByText('React')).toBeDefined()
    expect(screen.getByText('TypeScript')).toBeDefined()
  })

  it.each([
    { tags: ['React', 'TypeScript', 'Tailwind', 'Vite'], overflow: '+1' },
    {
      tags: ['React', 'TypeScript', 'Tailwind', 'Vite', 'Node'],
      overflow: '+2',
    },
  ])(
    'shows $overflow when project tags overflow the first three',
    async ({ tags, overflow }) => {
      await renderRoute(
        <ProjectCard
          showcase={makeShowcase({
            tags,
          })}
        />,
      )

      expect(screen.getByText('React')).toBeDefined()
      expect(screen.getByText('TypeScript')).toBeDefined()
      expect(screen.getByText('Tailwind')).toBeDefined()
      expect(screen.queryByText('Vite')).toBeNull()
      expect(screen.queryByText('Node')).toBeNull()
      expect(screen.getByText(overflow)).toBeDefined()
    },
  )

  it('does not render overflow badge when 3 or fewer tags', async () => {
    await renderRoute(
      <ProjectCard
        showcase={makeShowcase({ tags: ['React', 'TypeScript', 'Tailwind'] })}
      />,
    )

    expect(screen.queryByText(/^\+\d+$/)).toBeNull()
  })

  it('renders image when provided', async () => {
    await renderRoute(
      <ProjectCard
        showcase={makeShowcase({
          title: 'Img Project',
          image: '/img/test.png',
        })}
      />,
    )

    const img = screen.getByAltText('Img Project project thumbnail')
    expect(img).toBeDefined()
    expect(img.getAttribute('src')).toBe('/img/test.png')
  })

  it('renders first letter placeholder when no image', async () => {
    await renderRoute(
      <ProjectCard
        showcase={makeShowcase({ title: 'Zeta', image: undefined })}
      />,
    )

    expect(screen.getByText('Z')).toBeDefined()
  })
})
