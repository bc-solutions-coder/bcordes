import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@bcordes/ui/components/tooltip'

// Controlled open avoids pointer and timer races in jsdom.
describe('Tooltip', () => {
  it('does not render the content while closed', () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip text</TooltipContent>
      </Tooltip>,
    )
    expect(screen.queryByText('Tooltip text')).toBeNull()
  })

  it('shows and hides content when the controlled open state changes', async () => {
    function Content({ open }: { open: boolean }) {
      return (
        <Tooltip open={open}>
          <TooltipTrigger>Details</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      )
    }
    const { rerender } = render(<Content open />)
    expect(screen.getByRole('button', { name: 'Details' })).toBeVisible()
    await waitFor(() => expect(screen.getByText('Tooltip text')).toBeVisible())
    rerender(<Content open={false} />)
    await waitFor(() =>
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument(),
    )
  })
})
