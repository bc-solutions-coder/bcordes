import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { ProjectCard } from './ProjectCard'
import type { ShowcaseMeta } from '@/content/projects'
import { renderWithProviders } from '@/test/helpers/render'

vi.mock('@tanstack/react-router', () => ({
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
      ? to.replace(/\$(\w+)/g, (_, key) => params[key as string] || '')
      : to
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
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
  it('renders title, year, and description', () => {
    renderWithProviders(<ProjectCard showcase={makeShowcase()} />)

    expect(screen.getByText('Test Project')).toBeDefined()
    expect(screen.getByText('2025')).toBeDefined()
    expect(screen.getByText('A test project description')).toBeDefined()
  })

  it('renders a link whose href includes the slug', () => {
    renderWithProviders(
      <ProjectCard showcase={makeShowcase({ slug: 'my-app' })} />,
    )

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/projects/my-app')
  })

  it('renders tags as badges', () => {
    renderWithProviders(
      <ProjectCard
        showcase={makeShowcase({ tags: ['React', 'TypeScript'] })}
      />,
    )

    expect(screen.getByText('React')).toBeDefined()
    expect(screen.getByText('TypeScript')).toBeDefined()
  })

  it('shows overflow count when more than 3 tags', () => {
    renderWithProviders(
      <ProjectCard
        showcase={makeShowcase({
          tags: ['React', 'TypeScript', 'Tailwind', 'Vite', 'Node'],
        })}
      />,
    )

    expect(screen.getByText('React')).toBeDefined()
    expect(screen.getByText('TypeScript')).toBeDefined()
    expect(screen.getByText('Tailwind')).toBeDefined()
    expect(screen.queryByText('Vite')).toBeNull()
    expect(screen.queryByText('Node')).toBeNull()
    expect(screen.getByText('+2')).toBeDefined()
  })

  it('only renders first 3 tags', () => {
    renderWithProviders(
      <ProjectCard
        showcase={makeShowcase({
          tags: ['A', 'B', 'C', 'D'],
        })}
      />,
    )

    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('B')).toBeDefined()
    expect(screen.getByText('C')).toBeDefined()
    expect(screen.queryByText('D')).toBeNull()
    expect(screen.getByText('+1')).toBeDefined()
  })

  it('does not render overflow badge when 3 or fewer tags', () => {
    renderWithProviders(
      <ProjectCard
        showcase={makeShowcase({ tags: ['React', 'TypeScript', 'Tailwind'] })}
      />,
    )

    expect(screen.queryByText(/^\+\d+$/)).toBeNull()
  })

  it('renders image when provided', () => {
    renderWithProviders(
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

  it('renders first letter placeholder when no image', () => {
    renderWithProviders(
      <ProjectCard
        showcase={makeShowcase({ title: 'Zeta', image: undefined })}
      />,
    )

    expect(screen.getByText('Z')).toBeDefined()
  })
})
