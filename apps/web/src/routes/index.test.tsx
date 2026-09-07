import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { createMockUser } from '@bcordes/auth/testing'
import { renderFileRoute } from '../../testing/render-file-route'
import { controlIntersections, controlMotion } from '../../testing/motion'
import { Route } from './index'
import type { useUser } from '@/shared/auth'
import type { ShowcaseMeta } from '@/features/projects'

const { identity } = vi.hoisted(() => ({ identity: vi.fn<typeof useUser>() }))
vi.mock('@/shared/auth', () => ({ useUser: identity }))
vi.mock('@/features/projects/content/wallow', async () => ({
  ...(await vi.importActual('@/features/projects/content/wallow')),
  meta: {
    slug: 'wallow',
    title: 'Wallow',
    description: 'A newer project excluded from featured work.',
    client: 'BC Solutions, LLC',
    year: 2026,
    tags: ['TypeScript'],
    featured: false,
  } satisfies ShowcaseMeta,
}))

beforeEach(() => {
  identity.mockReturnValue({ user: null, isLoading: false })
  controlMotion(true)
  controlIntersections()
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Home page', () => {
  it('loads featured projects for the home page', async () => {
    await renderFileRoute(Route, '/')
    expect(screen.getByRole('link', { name: /Bcordes/ })).toHaveAttribute(
      'href',
      '/projects/bcordes',
    )
    expect(
      screen.queryByRole('link', { name: /Wallow/ }),
    ).not.toBeInTheDocument()
  })

  it('renders the introduction, services, featured work, and skills on the home page', async () => {
    await renderFileRoute(Route, '/')
    expect(
      screen.getByRole('heading', {
        name: /^Professional\s*Software Engineering$/,
        level: 1,
      }),
    ).toBeInTheDocument()
    for (const name of [
      'What I Do',
      'Featured Work',
      'Technologies & Skills',
    ]) {
      expect(
        screen.getByRole('heading', { name, level: 2 }),
      ).toBeInTheDocument()
    }
    expect(screen.getByText('Frontend Development')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bcordes/ })).toHaveAttribute(
      'href',
      '/projects/bcordes',
    )
  })

  it('renders "Let\'s Work Together" section', async () => {
    await renderFileRoute(Route, '/')
    expect(
      screen.getByRole('heading', { name: "Let's Work Together", level: 2 }),
    ).toBeInTheDocument()
  })

  it.each([
    { label: 'visitor', user: null, contact: true },
    {
      label: 'customer',
      user: createMockUser({ permissions: [] }),
      contact: true,
    },
    {
      label: 'inquiry staff',
      user: createMockUser({ permissions: ['InquiriesRead'] }),
      contact: false,
    },
  ])(
    'offers contact links to a $label according to inquiry-read permission',
    async ({ user, contact }) => {
      identity.mockReturnValue({ user, isLoading: false })
      await renderFileRoute(Route, '/')
      if (contact) {
        const links = screen.getAllByRole('link', { name: 'Get in Touch' })
        expect(links).toHaveLength(2)
        for (const link of links)
          expect(link).toHaveAttribute('href', '/contact')
      } else {
        expect(
          screen.queryByRole('link', { name: 'Get in Touch' }),
        ).not.toBeInTheDocument()
        expect(
          screen.queryByRole('heading', { name: "Let's Work Together" }),
        ).not.toBeInTheDocument()
      }
    },
  )
})
