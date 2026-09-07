import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { MainNav } from './MainNav'
import { MainNav as MainNavFromBarrel } from './index'
import type { NavItem } from './types'

// The Link stub applies activeProps using a test-controlled path.
let currentPath = '/'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    activeProps,
    activeOptions,
    className,
    ...rest
  }: {
    to: string
    children?: React.ReactNode
    activeProps?: { className?: string }
    activeOptions?: { exact?: boolean }
    className?: string
    [key: string]: unknown
  }) => {
    const isActive = activeOptions?.exact
      ? to === currentPath
      : to === '/'
        ? currentPath === '/'
        : currentPath === to || currentPath.startsWith(`${to}/`)
    const resolved = isActive
      ? (activeProps?.className ?? className)
      : className
    return (
      <a href={to} className={resolved} data-active={isActive} {...rest}>
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

describe('MainNav', () => {
  it('is importable from the package barrel (@bcordes/navigation)', () => {
    expect(typeof MainNavFromBarrel).toBe('function')
    expect(MainNavFromBarrel).toBe(MainNav)
  })

  it('renders one link per injected NavItem, using the injected labels/paths', () => {
    render(<MainNav items={ITEMS} />)

    for (const item of ITEMS) {
      const link = screen.getByText(item.label).closest('a')
      expect(link).not.toBeNull()
      expect(link!.getAttribute('href')).toBe(item.to)
    }
  })

  it('renders the injected items, not any hard-coded bcordes routes', () => {
    const custom: ReadonlyArray<NavItem> = [
      { label: 'Docs', to: '/docs' },
      { label: 'Pricing', to: '/pricing' },
    ]
    render(<MainNav items={custom} />)

    expect(screen.getByText('Docs')).toBeDefined()
    expect(screen.getByText('Pricing')).toBeDefined()

    expect(screen.queryByText('Projects')).toBeNull()
    expect(screen.queryByText('Resume')).toBeNull()
  })

  it('marks the active item from the current route', () => {
    currentPath = '/projects'
    render(<MainNav items={ITEMS} />)

    const active = screen.getByText('Projects').closest('a')
    const inactive = screen.getByText('About').closest('a')
    expect(active!.getAttribute('data-active')).toBe('true')
    expect(inactive!.getAttribute('data-active')).toBe('false')
    currentPath = '/'
  })

  it('honours NavItem.exact for active matching (exact item not active on child route)', () => {
    currentPath = '/projects/alpha'
    render(<MainNav items={ITEMS} />)

    const home = screen.getByText('Home').closest('a')
    expect(home!.getAttribute('data-active')).toBe('false')

    const projects = screen.getByText('Projects').closest('a')
    expect(projects!.getAttribute('data-active')).toBe('true')
    currentPath = '/'
  })

  it('renders the injected logo slot', () => {
    render(<MainNav items={ITEMS} logo={<div data-testid="logo">BRAND</div>} />)
    expect(screen.getByTestId('logo')).toBeDefined()
    expect(screen.getByText('BRAND')).toBeDefined()
  })

  it('renders the injected actions slot', () => {
    render(
      <MainNav
        items={ITEMS}
        actions={<button data-testid="cta">Get in Touch</button>}
      />,
    )
    expect(screen.getByTestId('cta')).toBeDefined()
  })

  it('renders no nav links for an empty items array', () => {
    const { container } = render(<MainNav items={[]} />)
    expect(container.querySelectorAll('a').length).toBe(0)
  })
})
