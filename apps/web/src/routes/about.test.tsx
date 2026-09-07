import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { createMockUser } from '@bcordes/auth/testing'
import { renderFileRoute } from '../../testing/render-file-route'
import { controlIntersections, controlMotion } from '../../testing/motion'
import { Route } from './about'
import type { useUser } from '@/shared/auth'

const { identity } = vi.hoisted(() => ({
  identity: vi.fn<typeof useUser>(),
}))
vi.mock('@/shared/auth', () => ({ useUser: identity }))
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

describe('About page', () => {
  describe('Page content', () => {
    it('renders the introduction when visiting the about page', async () => {
      await renderFileRoute(Route, '/about')
      expect(
        screen.getByRole('heading', { name: 'Bryan Cordes', level: 1 }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/passionate software engineer/),
      ).toBeInTheDocument()
    })

    it('includes career history on the about page', async () => {
      await renderFileRoute(Route, '/about')
      expect(
        screen.getByRole('heading', { name: 'Career Journey', level: 2 }),
      ).toBeInTheDocument()
      expect(screen.getByText('Intterra')).toBeInTheDocument()
    })

    it('renders My Approach section', async () => {
      await renderFileRoute(Route, '/about')
      expect(
        screen.getByRole('heading', { name: 'My Approach', level: 2 }),
      ).toBeTruthy()
    })

    it('names the four development principles', async () => {
      await renderFileRoute(Route, '/about')
      expect(screen.getByText('Quality-Driven Development')).toBeTruthy()
      expect(screen.getByText('Clear Communication')).toBeTruthy()
      expect(screen.getByText('Modern Tech Stack')).toBeTruthy()
      expect(screen.getByText('Client-Focused Solutions')).toBeTruthy()
    })

    it('offers a contact invitation to a signed-out visitor', async () => {
      await renderFileRoute(Route, '/about')
      expect(screen.getByText("Let's Build Something Great")).toBeTruthy()
      const link = screen.getByRole('link', { name: 'Get in Touch' })
      expect(link.closest('a')?.getAttribute('href')).toBe('/contact')
    })
  })
  it.each([
    { label: 'customer', permissions: [], contact: true },
    { label: 'inquiry staff', permissions: ['InquiriesRead'], contact: false },
  ])(
    'offers a contact invitation to $label according to permission',
    async ({ permissions, contact }) => {
      identity.mockReturnValue({
        user: createMockUser({ permissions }),
        isLoading: false,
      })
      await renderFileRoute(Route, '/about')
      if (contact) {
        expect(
          screen.getByRole('heading', { name: "Let's Build Something Great" }),
        ).toBeInTheDocument()
        expect(
          screen.getByRole('link', { name: 'Get in Touch' }),
        ).toHaveAttribute('href', '/contact')
      } else {
        expect(
          screen.queryByRole('heading', {
            name: "Let's Build Something Great",
          }),
        ).not.toBeInTheDocument()
        expect(
          screen.queryByRole('link', { name: 'Get in Touch' }),
        ).not.toBeInTheDocument()
      }
    },
  )
})
