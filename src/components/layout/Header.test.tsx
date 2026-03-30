import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { Header } from './Header'
import { renderWithProviders } from '@/test/helpers/render'

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    activeProps: _activeProps,
    ...rest
  }: {
    to: string
    children: React.ReactNode
    activeProps?: unknown
    [key: string]: unknown
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('./NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))

vi.mock('./UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))

vi.mock('./MobileNav', () => ({
  MobileNav: () => <div data-testid="mobile-nav" />,
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    })
  })

  it('renders all navigation link labels', () => {
    renderWithProviders(<Header />)

    expect(screen.getByText('Home')).toBeDefined()
    expect(screen.getByText('Projects')).toBeDefined()
    expect(screen.getByText('About')).toBeDefined()
    expect(screen.getByText('Resume')).toBeDefined()
  })

  it('renders logo/home link pointing to "/"', () => {
    renderWithProviders(<Header />)

    const logos = screen.getAllByAltText('BC Solutions')
    const logoLink = logos[0].closest('a')
    expect(logoLink).not.toBeNull()
    expect(logoLink!.getAttribute('href')).toBe('/')
  })

  it('renders "Get in Touch" CTA linking to /contact', () => {
    renderWithProviders(<Header />)

    const ctaElements = screen.getAllByText('Get in Touch')
    expect(ctaElements.length).toBeGreaterThan(0)
    const link = ctaElements[0].closest('a')
    expect(link).not.toBeNull()
    expect(link!.getAttribute('href')).toBe('/contact')
  })

  it('adds shadow class when scrolled down', () => {
    const { container } = renderWithProviders(<Header />)

    const header = container.querySelector('header')!
    expect(header.className).not.toContain('shadow-md')

    // Simulate scroll down
    Object.defineProperty(window, 'scrollY', {
      value: 100,
      writable: true,
      configurable: true,
    })
    fireEvent.scroll(window)

    expect(header.className).toContain('shadow-md')
  })

  it('removes shadow class when scrolled back to top', () => {
    // Start scrolled down
    Object.defineProperty(window, 'scrollY', {
      value: 100,
      writable: true,
      configurable: true,
    })

    const { container } = renderWithProviders(<Header />)

    const header = container.querySelector('header')!
    expect(header.className).toContain('shadow-md')

    // Scroll back to top
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    })
    fireEvent.scroll(window)

    expect(header.className).not.toContain('shadow-md')
  })

  it('renders child component stubs', () => {
    renderWithProviders(<Header />)

    expect(screen.getAllByTestId('notification-bell').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('user-menu').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('mobile-nav').length).toBeGreaterThan(0)
  })
})
