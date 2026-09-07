import { logout } from '@bc-solutions-coder/sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { Toaster } from '@bcordes/ui/components/sonner'
import { renderRoute } from '../../../../testing/render-route'
import { UserMenu } from './UserMenu'

const mockUseUser = vi.fn()
vi.mock('@/shared/auth', () => ({
  useUser: () => mockUseUser(),
}))

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

vi.mock('@bc-solutions-coder/sdk', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}))

describe('UserMenu', () => {
  it('hides account actions while user identity is loading', async () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: true })
    await renderRoute(<UserMenu />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers a sign-in link when signed out', async () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: false })
    await renderRoute(
      <>
        <UserMenu />
        <Toaster />
      </>,
    )
    const signIn = screen.getByRole('link', { name: 'Sign In' })
    expect(signIn).toBeInTheDocument()
    expect(signIn).toHaveAttribute('href', '/bff/login')
  })

  it('shows user name and initials when authenticated', async () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Bryan Cordes', email: 'bryan@example.com' },
      isLoading: false,
    })
    await renderRoute(
      <>
        <UserMenu />
        <Toaster />
      </>,
    )
    expect(screen.getByText('Bryan Cordes')).toBeInTheDocument()
    expect(screen.getByText('BC')).toBeInTheDocument()
  })

  it('shows the first initial for a single-word name', async () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Bryan', email: 'bryan@example.com' },
      isLoading: false,
    })
    await renderRoute(
      <>
        <UserMenu />
        <Toaster />
      </>,
    )
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('shows fallback "?" when user has no name', async () => {
    mockUseUser.mockReturnValue({
      user: { name: undefined, email: 'test@example.com' },
      isLoading: false,
    })
    await renderRoute(
      <>
        <UserMenu />
        <Toaster />
      </>,
    )
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('falls back to email when name is null', async () => {
    mockUseUser.mockReturnValue({
      user: { name: null, email: 'test@example.com' },
      isLoading: false,
    })
    await renderRoute(
      <>
        <UserMenu />
        <Toaster />
      </>,
    )
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('falls back to "User" when name and email are null', async () => {
    mockUseUser.mockReturnValue({
      user: { name: null, email: null },
      isLoading: false,
    })
    await renderRoute(
      <>
        <UserMenu />
        <Toaster />
      </>,
    )
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('offers the dashboard destination and signs out through the SDK', async () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Bryan Cordes', email: 'bryan@example.com' },
      isLoading: false,
    })
    await renderRoute(
      <>
        <UserMenu />
        <Toaster />
      </>,
    )

    const trigger = screen.getByRole('button', { name: /Bryan Cordes/ })
    fireEvent.click(trigger)

    expect(
      await screen.findByRole('menuitem', { name: 'Dashboard' }),
    ).toHaveAttribute('href', '/dashboard/inquiries')
    const signOut = await screen.findByRole('menuitem', { name: 'Sign Out' })
    expect(signOut).toBeInTheDocument()

    expect(fireEvent.click(signOut)).toBe(false)
    expect(logout).toHaveBeenCalledOnce()
  })
  it('reports a failed sign-out so the user can try again', async () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Bryan Cordes', email: 'bryan@example.com' },
      isLoading: false,
    })
    vi.mocked(logout).mockRejectedValueOnce(new Error('Logout unavailable'))
    await renderRoute(
      <>
        <UserMenu />
        <Toaster />
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Bryan Cordes/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign Out' }))
    expect(
      await screen.findByText('Unable to sign out. Please try again.'),
    ).toBeVisible()
  })
})
