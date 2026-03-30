import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { MobileNav } from './MobileNav'
import { renderWithProviders } from '@/test/helpers/render'

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
vi.mock('@/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseUser.mockReturnValue({ user: null, isLoading: false })
})

afterEach(() => {
  cleanup()
})

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
      user: { name: 'Test User', email: 'test@example.com', roles: ['user'] },
      isLoading: false,
    })
    renderWithProviders(<MobileNav />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('creates and submits a logout form when Sign Out is clicked', () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Test User', email: 'test@example.com', roles: ['user'] },
      isLoading: false,
    })

    const submitSpy = vi.fn()
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(submitSpy)

    renderWithProviders(<MobileNav />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    fireEvent.click(screen.getByText('Sign Out'))

    const appendedForm = appendChildSpy.mock.calls.find(
      (call) => call[0] instanceof HTMLFormElement,
    )
    expect(appendedForm).toBeDefined()

    const form = appendedForm![0] as HTMLFormElement
    expect(form.method).toBe('post')
    expect(form.action).toContain('/auth/logout')
    expect(submitSpy).toHaveBeenCalled()

    appendChildSpy.mockRestore()
  })
})
