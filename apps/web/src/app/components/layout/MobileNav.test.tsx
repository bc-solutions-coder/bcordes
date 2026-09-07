import { logout } from '@bc-solutions-coder/sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@bcordes/test-utils'
import { MobileNav } from './MobileNav'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    to: string
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <a href={to} onClick={onClick} {...props}>
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
  mockUseUser.mockReturnValue({ user: null, isLoading: false })
})

afterEach(() => {
  cleanup()
})

vi.mock('@bc-solutions-coder/sdk', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}))

describe('MobileNav', () => {
  it('renders the hamburger menu button', () => {
    renderWithProviders(<MobileNav />)
    expect(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    ).toBeInTheDocument()
  })

  it('renders nav links when sheet is opened', async () => {
    renderWithProviders(<MobileNav />)
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    fireEvent.click(trigger)

    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Resume')).toBeInTheDocument()
  })

  it('shows Sign In button when user is not authenticated', () => {
    renderWithProviders(<MobileNav />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('shows Dashboard and Sign Out when user is authenticated', () => {
    mockUseUser.mockReturnValue({
      user: {
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['InquiriesWrite'],
      },
      isLoading: false,
    })
    renderWithProviders(<MobileNav />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('calls SDK logout when Sign Out is clicked', () => {
    mockUseUser.mockReturnValue({
      user: {
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['InquiriesWrite'],
      },
      isLoading: false,
    })

    renderWithProviders(<MobileNav />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    fireEvent.click(screen.getByText('Sign Out'))

    expect(logout).toHaveBeenCalledOnce()
  })
})
