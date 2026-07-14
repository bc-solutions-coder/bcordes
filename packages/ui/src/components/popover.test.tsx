import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

// Contract net for the @radix-ui/react-popover -> Base UI
// (@base-ui/react/popover) migration.
// Preserved: data-slot="popover-trigger" (trigger) + data-slot="popover-content"
//   (popup), click-to-open / Escape-to-close behavior, the content renders its
//   children and merges a caller className.
// Changed (drives the migration): Portal+Content becomes
//   Portal+Positioner+Popup; PopoverContent is now the Popup part. PopoverAnchor
//   is dropped (no Base UI equivalent, no consumers) so it is not imported here.
describe('Popover (Radix -> Base UI migration contract)', () => {
  it('renders the trigger with data-slot="popover-trigger" and stays closed initially', () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    )
    const trigger = screen.getByText('Open popover')
    expect(trigger).toHaveAttribute('data-slot', 'popover-trigger')
    expect(screen.queryByText('Popover body')).toBeNull()
  })

  it('opens on trigger click and renders the popup with data-slot="popover-content"', async () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    )
    fireEvent.click(screen.getByText('Open popover'))
    const body = await screen.findByText('Popover body')
    const content = body.closest('[data-slot="popover-content"]')
    expect(content).not.toBeNull()
  })

  it('merges a caller className onto the popup', async () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent className="custom-popover">Popover body</PopoverContent>
      </Popover>,
    )
    fireEvent.click(screen.getByText('Open popover'))
    await screen.findByText('Popover body')
    const content = document.querySelector('[data-slot="popover-content"]')
    expect(content).toHaveClass('custom-popover')
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
