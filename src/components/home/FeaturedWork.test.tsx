import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { FeaturedWork } from './FeaturedWork'
import type { ShowcaseMeta } from '@/content/projects'

vi.mock('@/hooks/useScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: createRef(),
    isVisible: true,
  })),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}))

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
      ? to.replace(/\$(\w+)/g, (_, key: string) => params[key] ?? '')
      : to
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  },
}))

const mockShowcases: Array<ShowcaseMeta> = [
  {
    slug: 'project-alpha',
    title: 'Project Alpha',
    description: 'A cutting-edge web application for data visualization.',
    client: 'Acme Corp',
    year: 2025,
    tags: ['React', 'TypeScript', 'D3.js', 'Extra Tag'],
    featured: true,
  },
  {
    slug: 'project-beta',
    title: 'Project Beta',
    description: 'An e-commerce platform with real-time inventory.',
    client: 'Beta Inc',
    year: 2024,
    tags: ['Next.js', 'PostgreSQL', 'Stripe'],
    featured: false,
  },
]

describe('FeaturedWork', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders nothing when showcases array is empty', () => {
    const { container } = render(<FeaturedWork showcases={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the section heading', () => {
    render(<FeaturedWork showcases={mockShowcases} />)
    expect(screen.getByText('Featured Work')).toBeTruthy()
  })

  it('renders the section description', () => {
    render(<FeaturedWork showcases={mockShowcases} />)
    expect(screen.getByText("Recent projects I'm proud of")).toBeTruthy()
  })

  it('renders "View all work" link pointing to /projects', () => {
    render(<FeaturedWork showcases={mockShowcases} />)
    const link = screen.getByText('View all work')
    expect(link.closest('a')?.getAttribute('href')).toBe('/projects')
  })

  it('renders project card titles', () => {
    render(<FeaturedWork showcases={mockShowcases} />)
    expect(screen.getByText('Project Alpha')).toBeTruthy()
    expect(screen.getByText('Project Beta')).toBeTruthy()
  })

  it('renders project descriptions', () => {
    render(<FeaturedWork showcases={mockShowcases} />)
    expect(screen.getByText(/cutting-edge web application/i)).toBeTruthy()
    expect(screen.getByText(/e-commerce platform/i)).toBeTruthy()
  })

  it('renders client names and years', () => {
    render(<FeaturedWork showcases={mockShowcases} />)
    expect(screen.getByText('Acme Corp')).toBeTruthy()
    expect(screen.getByText('2025')).toBeTruthy()
    expect(screen.getByText('Beta Inc')).toBeTruthy()
    expect(screen.getByText('2024')).toBeTruthy()
  })

  it('renders at most 3 tags per project', () => {
    render(<FeaturedWork showcases={mockShowcases} />)
    // Project Alpha has 4 tags but only 3 should render
    expect(screen.getByText('React')).toBeTruthy()
    expect(screen.getByText('TypeScript')).toBeTruthy()
    expect(screen.getByText('D3.js')).toBeTruthy()
    expect(screen.queryByText('Extra Tag')).toBeNull()
  })

  it('renders project links with correct hrefs', () => {
    render(<FeaturedWork showcases={mockShowcases} />)
    const alphaLink = screen.getByText('Project Alpha').closest('a')
    expect(alphaLink?.getAttribute('href')).toBe('/projects/project-alpha')

    const betaLink = screen.getByText('Project Beta').closest('a')
    expect(betaLink?.getAttribute('href')).toBe('/projects/project-beta')
  })
})
