import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Separator } from './separator'

// Contract net for the Radix -> Base UI (@base-ui/react/separator) migration.
// Preserved: data-slot="separator", base-token classes, className merge,
//   orientation reflected via a `data-orientation` attribute (drives the
//   Tailwind `data-[orientation=...]` styling selectors).
// Changed: the `decorative` prop is dropped -- Base UI always exposes an
//   accessible separator role with aria-orientation.
describe('Separator (Radix -> Base UI migration contract)', () => {
  it('renders without crashing and exposes data-slot="separator"', () => {
    const { container } = render(<Separator />)
    expect(container.querySelector('[data-slot="separator"]')).not.toBeNull()
  })

  it('defaults to horizontal orientation reflected via data-orientation', () => {
    const { container } = render(<Separator />)
    const el = container.querySelector('[data-slot="separator"]')!
    expect(el).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('forwards orientation="vertical" to data-orientation for styling selectors', () => {
    const { container } = render(<Separator orientation="vertical" />)
    const el = container.querySelector('[data-slot="separator"]')!
    expect(el).toHaveAttribute('data-orientation', 'vertical')
  })

  it('preserves the base-token classes (bg-border, shrink-0)', () => {
    const { container } = render(<Separator />)
    const el = container.querySelector('[data-slot="separator"]')!
    expect(el).toHaveClass('bg-border')
    expect(el).toHaveClass('shrink-0')
  })

  it('merges caller className', () => {
    const { container } = render(<Separator className="custom-sep" />)
    expect(container.querySelector('[data-slot="separator"]')).toHaveClass(
      'custom-sep',
    )
  })

  it('exposes an accessible separator role with aria-orientation (decorative dropped)', () => {
    render(<Separator orientation="vertical" />)
    const el = screen.getByRole('separator')
    expect(el).toHaveAttribute('aria-orientation', 'vertical')
  })
})
