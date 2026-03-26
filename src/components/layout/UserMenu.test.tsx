import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
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

  it('sign out creates and submits a POST form to /auth/logout', async () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Bryan Cordes', email: 'bryan@example.com' },
      isLoading: false,
    })
    renderWithProviders(<UserMenu />)

    // Open the Radix dropdown — requires pointerDown for Radix trigger
    const trigger = screen.getByText('Bryan Cordes').closest('button')!
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' })

    // Wait for dropdown content to appear
    const signOut = await screen.findByText('Sign Out')
    expect(signOut).toBeInTheDocument()

    // Mock form.submit since jsdom doesn't support navigation
    const mockSubmit = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'form') {
        el.submit = mockSubmit
      }
      return el
    })

    // Click the Sign Out link
    fireEvent.click(signOut)

    // Verify a form was created with POST method and /auth/logout action
    expect(mockSubmit).toHaveBeenCalledOnce()
    const form = document.querySelector('form[action="/auth/logout"]')
    expect(form).toBeTruthy()
    expect(form?.getAttribute('method')).toBe('POST')

    vi.restoreAllMocks()
  })
})
