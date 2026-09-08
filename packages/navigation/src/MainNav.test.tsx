import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { MainNav } from '@bcordes/navigation'
import { renderNavigation } from '../testing/render-navigation'

const items = [
  { label: 'Projects', to: '/projects' },
  { label: 'About', to: '/about' },
]

describe('Desktop navigation', () => {
  it('opens the destination selected from the supplied named links', async () => {
    renderNavigation(<MainNav items={items} />)
    const nav = await screen.findByRole('navigation')
    for (const item of items)
      expect(
        within(nav).getByRole('link', { name: item.label }),
      ).toHaveAttribute('href', item.to)
    fireEvent.click(within(nav).getByRole('link', { name: 'About' }))
    expect(
      await screen.findByRole('heading', { name: '/about destination' }),
    ).toBeVisible()
    expect(within(nav).getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      within(nav).getByRole('link', { name: 'Projects' }),
    ).not.toHaveAttribute('aria-current')
  })
  it('renders exactly the custom item links', async () => {
    renderNavigation(
      <MainNav
        items={[
          { label: 'Docs', to: '/docs' },
          { label: 'Pricing', to: '/pricing' },
        ]}
      />,
    )
    const nav = await screen.findByRole('navigation')
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Docs', '/docs'],
      ['Pricing', '/pricing'],
    ])
  })
  it.each([
    { exact: true, path: '/projects', active: true },
    { exact: false, path: '/projects', active: true },
    { exact: true, path: '/projects/alpha', active: false },
    { exact: false, path: '/projects/alpha', active: true },
  ])(
    'reports current-page state at $path with exact=$exact',
    async ({ exact, path, active }) => {
      renderNavigation(
        <MainNav items={[{ label: 'Projects', to: '/projects', exact }]} />,
        path,
      )
      const link = await screen.findByRole('link', { name: 'Projects' })
      if (active) expect(link).toHaveAttribute('aria-current', 'page')
      else expect(link).not.toHaveAttribute('aria-current')
    },
  )
  it('shows the supplied brand and keeps the supplied action usable', async () => {
    const onClick = vi.fn()
    renderNavigation(
      <MainNav
        items={items}
        logo={<span>Custom brand</span>}
        actions={<button onClick={onClick}>Get in touch</button>}
      />,
    )
    expect(await screen.findByText('Custom brand')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Get in touch' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('renders no item links for an empty collection while preserving a brand link', async () => {
    renderNavigation(
      <MainNav items={[]} logo={<a href="/docs">Custom brand</a>} />,
    )
    expect(
      within(await screen.findByRole('navigation')).queryAllByRole('link'),
    ).toEqual([])
    expect(screen.getByRole('link', { name: 'Custom brand' })).toHaveAttribute(
      'href',
      '/docs',
    )
  })
})
