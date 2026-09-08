import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@bcordes/ui/components/navigation-menu'

describe('NavigationMenu', () => {
  it('exposes a navigation landmark and named destination link', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/about">About</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    )
    expect(screen.getByRole('navigation')).toBeVisible()
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about',
    )
  })

  it('reports current-page semantics only for the active destination', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink active href="/about">
              About
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/projects">Projects</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    )
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Projects' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('shows the controlled panel destination and removes it when closed', async () => {
    function Menu({ value }: { value: string | null }) {
      return (
        <NavigationMenu value={value}>
          <NavigationMenuList>
            <NavigationMenuItem value="products">
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="/widgets">Widgets</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      )
    }
    const { rerender } = render(<Menu value="products" />)
    expect(
      await screen.findByRole('link', { name: 'Widgets' }),
    ).toHaveAttribute('href', '/widgets')
    rerender(<Menu value={null} />)
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Widgets' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('opens a trigger content panel on click', async () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/widgets">Widgets</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    )
    fireEvent.click(screen.getByText('Products'))
    expect(await screen.findByText('Widgets')).toBeInTheDocument()
  })
})
