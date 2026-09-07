import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { renderFileRoute } from '../../testing/render-file-route'
import { controlIntersections, controlMotion } from '../../testing/motion'
import { Route } from './contact'
import type { useUser } from '@/shared/auth'

const { identity, submit } = vi.hoisted(() => ({
  identity: vi.fn<typeof useUser>(),
  submit: vi.fn(),
}))
vi.mock('@/shared/auth', () => ({ useUser: identity }))
vi.mock('@/features/inquiries', () => ({ submitInquiry: submit }))
beforeEach(() => {
  identity.mockReturnValue({ user: null, isLoading: false })
  submit.mockReset()
  controlMotion(true)
  controlIntersections()
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Contact page', () => {
  describe('Page content', () => {
    it('renders the Get in Touch page heading', async () => {
      await renderFileRoute(Route, '/contact')
      expect(
        screen.getByRole('heading', { name: 'Get in Touch', level: 1 }),
      ).toBeTruthy()
    })

    it('offers named contact destinations and a remote-work location', async () => {
      await renderFileRoute(Route, '/contact')
      expect(screen.getByText('Contact Information')).toBeTruthy()
      expect(screen.getByRole('link', { name: 'BC@bcordes.dev' })).toBeTruthy()
      expect(
        screen.getByRole('link', { name: 'linkedin.com/in/bryancordes' }),
      ).toHaveAttribute('href', 'https://linkedin.com/in/bryancordes')
      expect(
        screen.getByRole('link', { name: 'github.com/BC-Solutions-Coder' }),
      ).toHaveAttribute('href', 'https://github.com/BC-Solutions-Coder')
      expect(screen.getByText('Remote / US-based')).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Remote / US-based' }),
      ).not.toBeInTheDocument()
    })

    it('renders email link with mailto href', async () => {
      await renderFileRoute(Route, '/contact')
      const emailLink = screen.getByRole('link', { name: 'BC@bcordes.dev' })
      expect(emailLink.closest('a')?.getAttribute('href')).toBe(
        'mailto:BC@bcordes.dev',
      )
    })

    it('renders availability status', async () => {
      await renderFileRoute(Route, '/contact')
      expect(screen.getByText('Available for projects')).toBeTruthy()
    })

    it('offers a usable inquiry form on the contact page', async () => {
      await renderFileRoute(Route, '/contact')
      for (const name of ['Name', 'Email', 'Phone', 'Company', 'Message']) {
        expect(
          screen.getByRole('textbox', { name: new RegExp(`^${name}`) }),
        ).toBeEnabled()
      }
      fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))
      expect(await screen.findByText('Name is required')).toBeVisible()
      expect(submit).not.toHaveBeenCalled()
    })

    it('renders the Send a Message section heading', async () => {
      await renderFileRoute(Route, '/contact')
      expect(
        screen.getByRole('heading', { name: 'Send a Message', level: 2 }),
      ).toBeTruthy()
    })
  })
})
