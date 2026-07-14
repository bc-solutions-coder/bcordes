import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, badgeVariants } from './badge'

// Contract net for the Radix Slot -> Base UI (@base-ui/react/use-render) migration.
// Preserved: native <span> by default, data-slot="badge", the exported
//   badgeVariants CVA (consumed externally), caller className merging, and all
//   variant class strings (this is a primitive swap, not a restyle).
// Changed (drives the migration): polymorphism moves from `asChild` + Slot to
//   Base UI's `render` prop -- <Badge render={<a />}> composes the badge classes
//   onto the anchor (mirrors button.test.tsx's render-prop contract).
describe('Badge (Radix Slot -> Base UI render migration contract)', () => {
  it('renders a native <span> by default', () => {
    render(<Badge>New</Badge>)
    const badge = screen.getByText('New')
    expect(badge.tagName).toBe('SPAN')
  })

  it('preserves data-slot on the root', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toHaveAttribute('data-slot', 'badge')
  })

  it('merges caller className with the variant classes', () => {
    render(<Badge className="custom-badge">New</Badge>)
    expect(screen.getByText('New')).toHaveClass('custom-badge')
  })

  it('keeps badgeVariants exported and producing per-variant classes', () => {
    expect(typeof badgeVariants).toBe('function')
    expect(badgeVariants({ variant: 'default' })).toContain('bg-primary')
    expect(badgeVariants({ variant: 'secondary' })).toContain('bg-secondary')
    expect(badgeVariants({ variant: 'destructive' })).toContain(
      'bg-destructive',
    )
    expect(badgeVariants({ variant: 'outline' })).toContain('text-foreground')
  })

  it('applies the resolved variant classes onto the rendered badge', () => {
    render(<Badge variant="default">New</Badge>)
    expect(screen.getByText('New')).toHaveClass('bg-primary')
  })

  // POLYMORPHISM: the NEW Base UI contract (render prop) replaces asChild/Slot.
  it('composes onto an anchor via the render prop (asChild -> render)', () => {
    render(
      <Badge render={<a href="/projects" />} variant="default">
        Projects
      </Badge>,
    )
    const link = screen.getByRole('link', { name: 'Projects' })
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/projects')
    // badge chrome rides along on the anchor
    expect(link).toHaveAttribute('data-slot', 'badge')
    expect(link).toHaveClass('bg-primary')
  })
})
