import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Checkbox } from './checkbox'

// Contract net for the @radix-ui/react-checkbox -> Base UI
// (@base-ui/react/checkbox) migration.
// Preserved: role="checkbox", data-slot="checkbox" (root) +
//   data-slot="checkbox-indicator" (indicator), the lucide CheckIcon inside the
//   indicator when checked, className merge, the `peer` base class.
// Changed (drives the migration): Base UI emits data-checked / data-unchecked /
//   data-indeterminate attributes instead of Radix's data-state values.
describe('Checkbox (Radix -> Base UI migration contract)', () => {
  it('renders with role="checkbox" and data-slot="checkbox"', () => {
    render(<Checkbox />)
    const cb = screen.getByRole('checkbox')
    expect(cb).toHaveAttribute('data-slot', 'checkbox')
  })

  it('reflects the checked state via aria-checked and a data-checked attribute', () => {
    render(<Checkbox defaultChecked />)
    const cb = screen.getByRole('checkbox')
    expect(cb).toHaveAttribute('aria-checked', 'true')
    expect(cb).toHaveAttribute('data-checked')
  })

  it('reflects the unchecked state via a data-unchecked attribute', () => {
    render(<Checkbox />)
    const cb = screen.getByRole('checkbox')
    expect(cb).toHaveAttribute('aria-checked', 'false')
    expect(cb).toHaveAttribute('data-unchecked')
  })

  it('renders the indicator with the CheckIcon svg when checked', () => {
    const { container } = render(<Checkbox defaultChecked />)
    const indicator = container.querySelector(
      '[data-slot="checkbox-indicator"]',
    )
    expect(indicator).not.toBeNull()
    expect(indicator!.querySelector('svg')).not.toBeNull()
  })

  it('merges caller className and keeps the peer base class', () => {
    render(<Checkbox className="custom-check" />)
    const cb = screen.getByRole('checkbox')
    expect(cb).toHaveClass('custom-check')
    expect(cb).toHaveClass('peer')
  })
})
