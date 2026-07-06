import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

// Contract net for the @radix-ui/react-tooltip -> Base UI
// (@base-ui/react/tooltip) migration.
// Preserved: data-slot="tooltip-trigger" (trigger) + data-slot="tooltip-content"
//   (popup), the trigger renders its children, the content renders its text and
//   merges a caller className.
// Changed (drives the migration): Portal+Content becomes
//   Portal+Positioner+Popup; TooltipContent is now the Popup part. This is a
//   portaled overlay, so the controlled `open` prop is used to force it visible
//   (reliable in jsdom, no pointer/timer racing).
describe('Tooltip (Radix -> Base UI migration contract)', () => {
  it('renders the trigger with data-slot="tooltip-trigger"', () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip text</TooltipContent>
      </Tooltip>,
    )
    const trigger = screen.getByText('Hover me')
    expect(trigger).toHaveAttribute('data-slot', 'tooltip-trigger')
  })

  it('does not render the content while closed', () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip text</TooltipContent>
      </Tooltip>,
    )
    expect(screen.queryByText('Tooltip text')).toBeNull()
  })

  it('shows the content with data-slot="tooltip-content" and its text when open', async () => {
    render(
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip text</TooltipContent>
      </Tooltip>,
    )
    // Query by the stable data-slot (not text): overlays may render an extra
    // visually-hidden a11y copy of the label that has no data-slot.
    await waitFor(() => {
      const content = document.querySelector('[data-slot="tooltip-content"]')
      expect(content).not.toBeNull()
      expect(content).toHaveTextContent('Tooltip text')
    })
  })

  it('merges a caller className onto the content', async () => {
    render(
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent className="custom-tooltip">Tooltip text</TooltipContent>
      </Tooltip>,
    )
    await waitFor(() => {
      const content = document.querySelector('[data-slot="tooltip-content"]')
      expect(content).not.toBeNull()
      expect(content).toHaveClass('custom-tooltip')
    })
  })
})
