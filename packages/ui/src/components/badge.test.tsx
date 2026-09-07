import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, badgeVariants } from './badge'

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

  it('composes onto an anchor via the render prop (asChild -> render)', () => {
    render(
      <Badge render={<a href="/projects" />} variant="default">
        Projects
      </Badge>,
    )
    const link = screen.getByRole('link', { name: 'Projects' })
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/projects')
    expect(link).toHaveAttribute('data-slot', 'badge')
    expect(link).toHaveClass('bg-primary')
  })
})
