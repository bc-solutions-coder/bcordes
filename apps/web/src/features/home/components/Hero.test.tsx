import { createMockUser } from '@bcordes/auth/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { renderRoute } from '../../../../testing/render-route'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { Hero } from './Hero'
import type { useUser } from '@/shared/auth'

const { identity } = vi.hoisted(() => ({ identity: vi.fn<typeof useUser>() }))
vi.mock('@/shared/auth', () => ({ useUser: identity }))

describe('Hero', () => {
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

  it('shows Professional Software Engineering as the page heading', async () => {
    await renderRoute(<Hero />)
    expect(
      screen.getByRole('heading', {
        name: /^Professional\s*Software Engineering$/,
        level: 1,
      }),
    ).toBeInTheDocument()
  })

  it('introduces BC Solutions web application services', async () => {
    await renderRoute(<Hero />)
    expect(screen.getByText(/BC Solutions delivers high-quality/i)).toBeTruthy()
  })

  it('announces availability for projects as a status', async () => {
    await renderRoute(<Hero />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Available for Projects',
    )
  })

  it('shows project and contact links to visitors without inquiry-read permission', async () => {
    await renderRoute(<Hero />)
    const projectsLink = screen.getByRole('link', { name: 'View My Projects' })
    expect(projectsLink.getAttribute('href')).toBe('/projects')

    const contactLink = screen.getByRole('link', { name: 'Get in Touch' })
    expect(contactLink.getAttribute('href')).toBe('/contact')
  })

  it('pairs experience, delivery, and satisfaction statistics with their values', async () => {
    await renderRoute(<Hero />)
    const items = within(
      screen.getByRole('list', { name: 'Key statistics' }),
    ).getAllByRole('listitem')
    for (const [label, value] of [
      ['Years Experience', '7+'],
      ['Projects Delivered', '25+'],
      ['Client Satisfaction', '100%'],
    ]) {
      const item = items.find((candidate) =>
        within(candidate).queryByText(label),
      )
      expect(item).toHaveTextContent(value)
    }
  })

  it('exposes the introduction as a named region', async () => {
    await renderRoute(<Hero />)
    expect(screen.getByRole('region', { name: 'Introduction' })).toBeTruthy()
  })

  it('exposes three items in the Key statistics list', async () => {
    await renderRoute(<Hero />)
    expect(screen.getByRole('list', { name: 'Key statistics' })).toBeTruthy()
    expect(
      within(screen.getByRole('list', { name: 'Key statistics' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(3)
  })
  it.each([
    { label: 'customer', permissions: [], contact: true },
    { label: 'inquiry staff', permissions: ['InquiriesRead'], contact: false },
  ])(
    'offers contact to $label according to inquiry-read permission',
    async ({ permissions, contact }) => {
      identity.mockReturnValue({
        user: createMockUser({ permissions }),
        isLoading: false,
      })
      await renderRoute(<Hero />)
      expect(
        screen.getByRole('link', { name: 'View My Projects' }),
      ).toHaveAttribute('href', '/projects')
      if (contact)
        expect(
          screen.getByRole('link', { name: 'Get in Touch' }),
        ).toHaveAttribute('href', '/contact')
      else
        expect(
          screen.queryByRole('link', { name: 'Get in Touch' }),
        ).not.toBeInTheDocument()
    },
  )
})
