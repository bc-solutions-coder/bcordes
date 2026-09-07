import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

// Controlled open avoids pointer and timer races in jsdom.
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
    // The data-slot excludes the hidden accessibility copy of the label.
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
