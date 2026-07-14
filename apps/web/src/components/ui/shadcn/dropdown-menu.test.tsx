import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

// Contract net for the @radix-ui/react-dropdown-menu -> Base UI
// (@base-ui/react/menu, Menu.*) migration.
// Preserved: the public DropdownMenu* export names, every part's
//   data-slot="dropdown-menu-*", trigger opens the menu, items are menuitems,
//   label + separator render.
// Changed (drives the migration): Content becomes Portal > Positioner > Popup;
//   checkbox/radio checked state moves from data-[state=checked] to the Base UI
//   data-checked attribute; the checkbox/radio indicators gain their own
//   data-slot spans (dropdown-menu-checkbox-item-indicator /
//   dropdown-menu-radio-item-indicator) and the radio indicator uses CheckIcon.
describe('DropdownMenu (Radix -> Base UI migration contract)', () => {
  it('opens the menu from the trigger', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    expect(screen.queryByText('Profile')).toBeNull()
    fireEvent.click(screen.getByText('Open menu'))
    expect(await screen.findByText('Profile')).toBeInTheDocument()
  })

  it('renders items with data-slot="dropdown-menu-item" and menuitem role', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    const item = screen.getByText('Profile')
    expect(item).toHaveAttribute('data-slot', 'dropdown-menu-item')
    expect(item).toHaveAttribute('role', 'menuitem')
  })

  it('fires onClick when an item is activated', () => {
    const onClick = vi.fn()
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onClick}>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    fireEvent.click(screen.getByText('Profile'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('reflects checkbox checked state via data-checked plus an indicator slot', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>
            Show status bar
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    const item = screen
      .getByText('Show status bar')
      .closest('[data-slot="dropdown-menu-checkbox-item"]')
    expect(item).not.toBeNull()
    expect(item).toHaveAttribute('data-checked')
    expect(
      document.querySelector(
        '[data-slot="dropdown-menu-checkbox-item-indicator"]',
      ),
    ).not.toBeNull()
  })

  it('reflects the selected radio item via data-checked plus an indicator slot', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Option B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    const selected = screen
      .getByText('Option A')
      .closest('[data-slot="dropdown-menu-radio-item"]')
    expect(selected).toHaveAttribute('data-checked')
    expect(
      document.querySelector(
        '[data-slot="dropdown-menu-radio-item-indicator"]',
      ),
    ).not.toBeNull()
  })

  it('renders label and separator with their data-slots', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    expect(screen.getByText('My Account')).toHaveAttribute(
      'data-slot',
      'dropdown-menu-label',
    )
    expect(
      document.querySelector('[data-slot="dropdown-menu-separator"]'),
    ).not.toBeNull()
  })

  it('closes the menu after an item is selected', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    fireEvent.click(screen.getByText('Open menu'))
    fireEvent.click(await screen.findByText('Profile'))
    await waitFor(() => {
      expect(screen.queryByText('Profile')).toBeNull()
    })
  })
})
