import { logout } from '@bc-solutions-coder/sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Toaster } from '@bcordes/ui/components/sonner'
import { renderRoute } from '../../../../testing/render-route'
import { MobileNav } from './MobileNav'

const mockUseUser = vi.fn()
vi.mock('@/shared/auth', () => ({
  useUser: () => mockUseUser(),
}))

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
  vi.clearAllMocks()
  mockUseUser.mockReturnValue({ user: null, isLoading: false })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

vi.mock('@bc-solutions-coder/sdk', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}))

describe('MobileNav', () => {
  it('opens public navigation links and closes after selecting a destination', async () => {
    await renderRoute(
      <>
        <MobileNav />
        <Toaster />
      </>,
    )
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    fireEvent.click(trigger)

    for (const [name, href] of [
      ['Home', '/'],
      ['Projects', '/projects'],
      ['About', '/about'],
      ['Resume', '/resume'],
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }
    fireEvent.click(screen.getByRole('link', { name: 'Projects' }))
    expect(
      await screen.findByRole('heading', { name: 'Selected destination' }),
    ).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers a sign-in link when signed out', async () => {
    await renderRoute(
      <>
        <MobileNav />
        <Toaster />
      </>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/bff/login',
    )
  })

  it('offers dashboard and sign-out actions when authenticated', async () => {
    mockUseUser.mockReturnValue({
      user: {
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['InquiriesWrite'],
      },
      isLoading: false,
    })
    await renderRoute(
      <>
        <MobileNav />
        <Toaster />
      </>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard/inquiries',
    )
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('closes navigation and reports a failed sign-out', async () => {
    mockUseUser.mockReturnValue({
      user: {
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['InquiriesWrite'],
      },
      isLoading: false,
    })

    await renderRoute(
      <>
        <MobileNav />
        <Toaster />
      </>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    vi.mocked(logout).mockRejectedValueOnce(new Error('Logout unavailable'))
    fireEvent.click(screen.getByText('Sign Out'))

    expect(logout).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(
      await screen.findByText('Unable to sign out. Please try again.'),
    ).toBeVisible()
  })
  it.each(['Get in Touch', 'Dashboard'])(
    'closes mobile navigation after choosing %s',
    async (name) => {
      mockUseUser.mockReturnValue({
        user: { name: 'Customer', permissions: [] },
        isLoading: false,
      })
      await renderRoute(<MobileNav />)
      fireEvent.click(
        screen.getByRole('button', { name: 'Open navigation menu' }),
      )
      fireEvent.click(screen.getByRole('link', { name }))
      expect(
        await screen.findByRole('heading', { name: 'Selected destination' }),
      ).toBeVisible()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    },
  )
  it('hides the contact action for inquiry administrators', async () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Administrator', permissions: ['InquiriesRead'] },
      isLoading: false,
    })
    await renderRoute(<MobileNav />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    expect(
      screen.queryByRole('link', { name: 'Get in Touch' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard/inquiries',
    )
  })
})
