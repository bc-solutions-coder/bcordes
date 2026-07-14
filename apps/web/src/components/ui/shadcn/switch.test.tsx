import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Switch } from './switch'

// Contract net for the radix-ui -> Base UI (@base-ui/react/switch) migration.
// Preserved: role="switch", data-slot="switch" (root) + data-slot="switch-thumb"
//   (thumb), aria-checked reflecting state, className merge, the `peer` base class.
// Changed (drives the migration): Base UI emits data-checked / data-unchecked
//   attributes instead of Radix's data-state="checked|unchecked" (the styling
//   selectors are remapped to match).
describe('Switch (Radix -> Base UI migration contract)', () => {
  it('renders with role="switch" and data-slot="switch"', () => {
    render(<Switch />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('data-slot', 'switch')
  })

  it('renders a thumb with data-slot="switch-thumb"', () => {
    const { container } = render(<Switch />)
    expect(container.querySelector('[data-slot="switch-thumb"]')).not.toBeNull()
  })

  it('reflects the checked state via aria-checked and a data-checked attribute', () => {
    render(<Switch defaultChecked />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(sw).toHaveAttribute('data-checked')
  })

  it('reflects the unchecked state via a data-unchecked attribute', () => {
    render(<Switch />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(sw).toHaveAttribute('data-unchecked')
  })

  it('merges caller className and keeps the peer base class', () => {
    render(<Switch className="custom-switch" />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveClass('custom-switch')
    expect(sw).toHaveClass('peer')
  })
})
