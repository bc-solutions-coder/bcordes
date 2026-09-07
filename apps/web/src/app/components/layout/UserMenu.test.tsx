import { logout } from '@bc-solutions-coder/sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@bcordes/test-utils'
import { UserMenu } from './UserMenu'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
    [key: string]: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const mockUseUser = vi.fn()
vi.mock('@/shared/auth', () => ({
  useUser: () => mockUseUser(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

vi.mock('@bc-solutions-coder/sdk', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}))

describe('UserMenu', () => {
  it('returns null when loading', () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: true })
    const { container } = renderWithProviders(<UserMenu />)
    expect(container.innerHTML).toBe('')
  })

  it('shows Sign In link when no user', () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: false })
    renderWithProviders(<UserMenu />)
    const signIn = screen.getByText('Sign In')
    expect(signIn).toBeInTheDocument()
    expect(signIn.closest('a')).toHaveAttribute('href', '/bff/login')
  })

  it('shows user name and initials when authenticated', () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Bryan Cordes', email: 'bryan@example.com' },
      isLoading: false,
    })
    renderWithProviders(<UserMenu />)
    expect(screen.getByText('Bryan Cordes')).toBeInTheDocument()
    expect(screen.getByText('BC')).toBeInTheDocument()
  })

  it('shows fallback initials when name is a single word', () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Bryan', email: 'bryan@example.com' },
      isLoading: false,
    })
    renderWithProviders(<UserMenu />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('shows fallback "?" when user has no name', () => {
    mockUseUser.mockReturnValue({
      user: { name: undefined, email: 'test@example.com' },
      isLoading: false,
    })
    renderWithProviders(<UserMenu />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('falls back to email when name is null', () => {
    mockUseUser.mockReturnValue({
      user: { name: null, email: 'test@example.com' },
      isLoading: false,
    })
    renderWithProviders(<UserMenu />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('falls back to "User" when name and email are null', () => {
    mockUseUser.mockReturnValue({
      user: { name: null, email: null },
      isLoading: false,
    })
    renderWithProviders(<UserMenu />)
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('sign out calls SDK logout', async () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Bryan Cordes', email: 'bryan@example.com' },
      isLoading: false,
    })
    renderWithProviders(<UserMenu />)

    // Open the Base UI menu — Menu.Trigger opens on click
    const trigger = screen.getByText('Bryan Cordes').closest('button')!
    fireEvent.click(trigger)

    // Wait for dropdown content to appear
    const signOut = await screen.findByText('Sign Out')
    expect(signOut).toBeInTheDocument()

    fireEvent.click(signOut)
    expect(logout).toHaveBeenCalledOnce()

    vi.restoreAllMocks()
  })
})
