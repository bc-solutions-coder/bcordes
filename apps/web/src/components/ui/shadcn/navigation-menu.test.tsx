import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './navigation-menu'

// Contract net for the @radix-ui/react-navigation-menu -> Base UI
// (@base-ui/react/navigation-menu, NavigationMenu.*) migration.
// Preserved: the public NavigationMenu* export names, data-slot="navigation-menu
//   -list"/"-item"/"-link"/"-content", the trigger reveals its content, links
//   render as anchors and expose data-active when active.
// Changed (drives the migration): the Radix Viewport is eliminated and replaced
//   by an internal Portal > Positioner > Popup > Viewport; NavigationMenuViewport
//   is no longer exported (so it is not imported here). Content reveal is driven
//   by the Root `value` (the open item's value) rather than Radix internals.
describe('NavigationMenu (Radix -> Base UI migration contract)', () => {
  it('renders list, item and link with their data-slots', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/about">About</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    )
    expect(
      document.querySelector('[data-slot="navigation-menu-list"]'),
    ).not.toBeNull()
    expect(
      document.querySelector('[data-slot="navigation-menu-item"]'),
    ).not.toBeNull()
    const link = screen.getByText('About')
    expect(link).toHaveAttribute('data-slot', 'navigation-menu-link')
  })

  it('exposes data-active on an active link', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink active href="/about">
              About
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    )
    expect(screen.getByText('About')).toHaveAttribute('data-active')
  })

  it('reveals a trigger content panel when its item is open', async () => {
    render(
      <NavigationMenu value="products">
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
    await waitFor(() => {
      const content = document.querySelector(
        '[data-slot="navigation-menu-content"]',
      )
      expect(content).not.toBeNull()
      expect(content).toHaveTextContent('Widgets')
    })
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
