import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@bcordes/ui/components/popover'

describe('Popover', () => {
  it('shows the named trigger while its body is closed', () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeVisible()
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument()
  })

  it('shows its body after the trigger is activated', async () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByText('Popover body')).toBeVisible()
  })

  it('closes when Escape is pressed', async () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    )
    fireEvent.click(screen.getByText('Open popover'))
    await screen.findByText('Popover body')
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    })
    await waitFor(() => {
      expect(screen.queryByText('Popover body')).toBeNull()
    })
  })
})
