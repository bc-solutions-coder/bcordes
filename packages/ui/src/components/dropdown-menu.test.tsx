import { useState } from 'react'
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
} from '@bcordes/ui/components/dropdown-menu'

describe('DropdownMenu', () => {
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

  it('exposes the named item in the open menu', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeVisible(),
    )
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

  it('toggles a menu checkbox and reports the new value', () => {
    const onCheckedChange = vi.fn()
    function Menu() {
      const [checked, setChecked] = useState(true)
      return (
        <DropdownMenu open>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={checked}
              onCheckedChange={(value) => {
                setChecked(value)
                onCheckedChange(value)
              }}
            >
              Show status bar
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    render(<Menu />)
    const item = screen.getByRole('menuitemcheckbox', {
      name: 'Show status bar',
    })
    expect(item).toBeChecked()
    fireEvent.click(item)
    expect(item).not.toBeChecked()
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
    fireEvent.click(item)
    expect(item).toBeChecked()
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
  })

  it('selects a different radio option and reports its value', () => {
    const onValueChange = vi.fn()
    function Menu() {
      const [value, setValue] = useState('a')
      return (
        <DropdownMenu open>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              value={value}
              onValueChange={(next) => {
                setValue(next)
                onValueChange(next)
              }}
            >
              <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="b">Option B</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    render(<Menu />)
    const a = screen.getByRole('menuitemradio', { name: 'Option A' }),
      b = screen.getByRole('menuitemradio', { name: 'Option B' })
    expect(a).toBeChecked()
    expect(b).not.toBeChecked()
    fireEvent.click(b)
    expect(a).not.toBeChecked()
    expect(b).toBeChecked()
    expect(onValueChange).toHaveBeenCalledWith('b')
  })

  it('shows the account heading and separator in the open menu', async () => {
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
    await waitFor(() => expect(screen.getByText('My Account')).toBeVisible())
    expect(screen.getByRole('separator')).toBeVisible()
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
