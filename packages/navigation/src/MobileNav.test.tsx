import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MobileNav } from '@bcordes/navigation'
import { renderNavigation } from '../testing/render-navigation'

const items = [
  { label: 'Projects', to: '/projects' },
  { label: 'About', to: '/about' },
]

describe('Mobile navigation', () => {
  it('opens the selected destination and reports navigation without closing the controlled sheet', async () => {
    const onNavigate = vi.fn()
    renderNavigation(<MobileNav items={items} open onNavigate={onNavigate} />)
    const dialog = await screen.findByRole('dialog', { name: 'Navigation' })
    for (const item of items)
      expect(
        within(dialog).getByRole('link', { name: item.label }),
      ).toHaveAttribute('href', item.to)
    fireEvent.click(within(dialog).getByRole('link', { name: 'About' }))
    await waitFor(() =>
      expect(
        within(dialog).getByRole('link', { name: 'About' }),
      ).toHaveAttribute('aria-current', 'page'),
    )
    expect(
      within(dialog).getByRole('link', { name: 'Projects' }),
    ).not.toHaveAttribute('aria-current')
    expect(onNavigate).toHaveBeenCalledOnce()
    expect(dialog).toBeVisible()
    expect(
      screen.getByRole('heading', { name: '/about destination', hidden: true }),
    ).toBeInTheDocument()
  })
  it('renders exactly the custom item links', async () => {
    renderNavigation(
      <MobileNav
        items={[
          { label: 'Docs', to: '/docs' },
          { label: 'Pricing', to: '/pricing' },
        ]}
        defaultOpen
      />,
    )
    const nav = within(await screen.findByRole('dialog')).getByRole(
      'navigation',
    )
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Docs', '/docs'],
      ['Pricing', '/pricing'],
    ])
  })
  it('shows the injected brand and opens the supplied sign-in destination', async () => {
    renderNavigation(
      <MobileNav
        items={items}
        defaultOpen
        logo={<span>Custom brand</span>}
        actions={<Link to="/auth/login">Sign In</Link>}
      />,
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Custom brand')).toBeVisible()
    const action = within(dialog).getByRole('link', { name: 'Sign In' })
    expect(action).toHaveAttribute('href', '/auth/login')
    fireEvent.click(action)
    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          name: '/auth/login destination',
          hidden: true,
        }),
      ).toBeInTheDocument(),
    )
  })
  it('opens and dismisses the sheet while reporting both public open-state changes', async () => {
    const onOpenChange = vi.fn()
    renderNavigation(
      <MobileNav
        items={items}
        triggerLabel="Browse pages"
        onOpenChange={onOpenChange}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Browse pages' }))
    expect(
      await screen.findByRole('dialog', { name: 'Navigation' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeVisible()
    expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(false)
  })
  it('keeps parent-controlled state authoritative and closes when the parent accepts dismissal', async () => {
    const onOpenChange = vi.fn()
    function Parent() {
      const [open, setOpen] = useState(true)
      return (
        <MobileNav
          items={items}
          open={open}
          onOpenChange={onOpenChange}
          actions={
            <button onClick={() => setOpen(false)}>Accept dismissal</button>
          }
        />
      )
    }
    renderNavigation(<Parent />)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(false)
    expect(dialog).toBeVisible()
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Accept dismissal' }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
  it('renders no item links for an empty collection', async () => {
    renderNavigation(
      <MobileNav
        items={[]}
        defaultOpen
        logo={<a href="/docs">Custom brand</a>}
      />,
    )
    const dialog = await screen.findByRole('dialog')
    expect(
      within(within(dialog).getByRole('navigation')).queryAllByRole('link'),
    ).toEqual([])
    expect(
      within(dialog).getByRole('link', { name: 'Custom brand' }),
    ).toHaveAttribute('href', '/docs')
  })
})
