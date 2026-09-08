import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Checkbox } from '@bcordes/ui/components/checkbox'

describe('Checkbox selection', () => {
  it('honors a checked initial value', () => {
    render(<Checkbox aria-label="Receive updates" defaultChecked />)
    expect(
      screen.getByRole('checkbox', { name: 'Receive updates' }),
    ).toBeChecked()
  })
  it('toggles both ways, reports public values and refuses disabled changes', () => {
    const onCheckedChange = vi.fn()
    const { rerender } = render(
      <Checkbox
        aria-label="Receive updates"
        onCheckedChange={onCheckedChange}
      />,
    )
    const control = screen.getByRole('checkbox', { name: 'Receive updates' })
    expect(control).not.toBeChecked()
    fireEvent.click(control)
    expect(control).toBeChecked()
    expect(onCheckedChange.mock.calls.at(-1)?.[0]).toBe(true)
    fireEvent.click(control)
    expect(control).not.toBeChecked()
    expect(onCheckedChange.mock.calls.at(-1)?.[0]).toBe(false)
    rerender(
      <Checkbox
        aria-label="Receive updates"
        onCheckedChange={onCheckedChange}
        disabled
      />,
    )
    fireEvent.click(control)
    expect(control).not.toBeChecked()
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
  })
})
