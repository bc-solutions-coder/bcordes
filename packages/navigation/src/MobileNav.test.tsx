import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { MobileNav } from './MobileNav'
import { MobileNav as MobileNavFromBarrel } from './index'
import type { NavItem } from './types'

// Same peer-dep Link stub strategy as MainNav.test.tsx: simulate active-state
// resolution against a test-controlled current path so the shell's active
// wiring is observable through the mock.
let currentPath = '/'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    activeProps,
    activeOptions,
    className,
    onClick,
    ...rest
  }: {
    to: string
    children?: React.ReactNode
    activeProps?: { className?: string }
    activeOptions?: { exact?: boolean }
    className?: string
    onClick?: (e: unknown) => void
    [key: string]: unknown
  }) => {
    const isActive = activeOptions?.exact
      ? to === currentPath
      : currentPath.startsWith(to)
    const resolved = isActive
      ? (activeProps?.className ?? className)
      : className
    return (
      <a
        href={to}
        className={resolved}
        data-active={isActive}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    )
  },
}))

const ITEMS: ReadonlyArray<NavItem> = [
  { label: 'Home', to: '/', exact: true },
  { label: 'Projects', to: '/projects' },
  { label: 'About', to: '/about' },
]

describe('MobileNav', () => {
  it('is importable from the package barrel (@bcordes/navigation)', () => {
    expect(typeof MobileNavFromBarrel).toBe('function')
    expect(MobileNavFromBarrel).toBe(MobileNav)
  })

  it('renders one link per injected NavItem when the sheet is open', () => {
    render(<MobileNav items={ITEMS} defaultOpen />)

    for (const item of ITEMS) {
      const link = screen.getByText(item.label).closest('a')
      expect(link).not.toBeNull()
      expect(link!.getAttribute('href')).toBe(item.to)
    }
  })

  it('renders the injected items, not any hard-coded bcordes routes', () => {
    const custom: ReadonlyArray<NavItem> = [{ label: 'Docs', to: '/docs' }]
    render(<MobileNav items={custom} defaultOpen />)

    expect(screen.getByText('Docs')).toBeDefined()
    expect(screen.queryByText('Projects')).toBeNull()
    expect(screen.queryByText('Resume')).toBeNull()
  })

  it('marks the active item from the current route', () => {
    currentPath = '/about'
    render(<MobileNav items={ITEMS} defaultOpen />)

    const active = screen.getByText('About').closest('a')
    expect(active!.getAttribute('data-active')).toBe('true')
    currentPath = '/'
  })

  it('renders the injected logo slot when open', () => {
    render(
      <MobileNav
        items={ITEMS}
        defaultOpen
        logo={<div data-testid="logo">BRAND</div>}
      />,
    )
    expect(screen.getByTestId('logo')).toBeDefined()
  })

  it('renders the injected actions slot when open', () => {
    render(
      <MobileNav
        items={ITEMS}
        defaultOpen
        actions={
          <a href="/auth/login" data-testid="sign-in">
            Sign In
          </a>
        }
      />,
    )
    expect(screen.getByTestId('sign-in')).toBeDefined()
  })

  it('renders a hamburger trigger with an accessible label', () => {
    render(<MobileNav items={ITEMS} triggerLabel="Open navigation menu" />)
    expect(screen.getByLabelText('Open navigation menu')).toBeDefined()
  })

  it('renders no nav links for an empty items array when open', () => {
    render(<MobileNav items={[]} defaultOpen />)
    // No injected item labels should appear.
    expect(screen.queryByText('Home')).toBeNull()
    expect(screen.queryByText('Projects')).toBeNull()
  })
})
