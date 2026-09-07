import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { renderRoute } from '../../../../testing/render-route'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { FeaturedWork } from './FeaturedWork'
import type { ShowcaseMeta } from '@/features/projects'

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
  beforeEach(() => {
    controlMotion(true)
    controlIntersections()
    vi.stubGlobal('scrollTo', vi.fn())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('omits the featured-work section when there are no showcases', async () => {
    await renderRoute(<FeaturedWork showcases={[]} />)
    expect(
      screen.queryByRole('heading', { name: 'Featured Work' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows Featured Work as a section heading when showcases exist', async () => {
    await renderRoute(<FeaturedWork showcases={mockShowcases} />)
    expect(
      screen.getByRole('heading', { name: 'Featured Work', level: 2 }),
    ).toBeTruthy()
  })

  it('renders the section description', async () => {
    await renderRoute(<FeaturedWork showcases={mockShowcases} />)
    expect(screen.getByText("Recent projects I'm proud of")).toBeTruthy()
  })

  it('links View all work to the projects page', async () => {
    await renderRoute(<FeaturedWork showcases={mockShowcases} />)
    const link = screen.getByRole('link', { name: 'View all work' })
    expect(link.getAttribute('href')).toBe('/projects')
  })

  it('shows a heading for each supplied project', async () => {
    await renderRoute(<FeaturedWork showcases={mockShowcases} />)
    expect(
      screen.getByRole('heading', { name: 'Project Alpha', level: 3 }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Project Beta', level: 3 }),
    ).toBeTruthy()
  })

  it('renders project descriptions', async () => {
    await renderRoute(<FeaturedWork showcases={mockShowcases} />)
    expect(screen.getByText(/cutting-edge web application/i)).toBeTruthy()
    expect(screen.getByText(/e-commerce platform/i)).toBeTruthy()
  })

  it('pairs each project with its client and year', async () => {
    await renderRoute(<FeaturedWork showcases={mockShowcases} />)
    for (const [name, client, year] of [
      ['Project Alpha', 'Acme Corp', '2025'],
      ['Project Beta', 'Beta Inc', '2024'],
    ]) {
      const card = within(screen.getByRole('link', { name: new RegExp(name) }))
      expect(card.getByText(client)).toBeInTheDocument()
      expect(card.getByText(year)).toBeInTheDocument()
    }
  })

  it('shows only the first three tags of each supplied project', async () => {
    await renderRoute(<FeaturedWork showcases={mockShowcases} />)
    const alpha = within(screen.getByRole('link', { name: /Project Alpha/ }))
    for (const tag of ['React', 'TypeScript', 'D3.js'])
      expect(alpha.getByText(tag)).toBeInTheDocument()
    expect(alpha.queryByText('Extra Tag')).not.toBeInTheDocument()
    const beta = within(screen.getByRole('link', { name: /Project Beta/ }))
    for (const tag of ['Next.js', 'PostgreSQL', 'Stripe'])
      expect(beta.getByText(tag)).toBeInTheDocument()
  })

  it('links each project title to its slug-specific project page', async () => {
    await renderRoute(<FeaturedWork showcases={mockShowcases} />)
    const alphaLink = screen.getByRole('link', { name: /Project Alpha/ })
    expect(alphaLink.getAttribute('href')).toBe('/projects/project-alpha')

    const betaLink = screen.getByRole('link', { name: /Project Beta/ })
    expect(betaLink.getAttribute('href')).toBe('/projects/project-beta')
  })
})
