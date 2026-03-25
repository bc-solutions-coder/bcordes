import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, screen } from '@testing-library/react'
import { UserMenu } from './UserMenu'
import { renderWithProviders } from '@/test/helpers/render'


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
vi.mock('@/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

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
    expect(signIn.closest('a')).toHaveAttribute('href', '/auth/login')
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
})
