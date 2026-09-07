import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button, buttonVariants } from './button'

describe('Button (Radix Slot -> Base UI render migration contract)', () => {
  it('renders a native <button> by default', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button', { name: 'Click' })
    expect(btn.tagName).toBe('BUTTON')
  })

  it('preserves data-slot, data-variant and data-size on the root', () => {
    render(
      <Button variant="secondary" size="lg">
        Go
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn).toHaveAttribute('data-slot', 'button')
    expect(btn).toHaveAttribute('data-variant', 'secondary')
    expect(btn).toHaveAttribute('data-size', 'lg')
  })

  it('merges caller className with the variant classes', () => {
    render(<Button className="custom-btn">Go</Button>)
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('custom-btn')
  })

  it('keeps buttonVariants exported and producing per-variant classes', () => {
    expect(typeof buttonVariants).toBe('function')
    expect(buttonVariants({ variant: 'default' })).toContain('bg-primary')
    expect(buttonVariants({ variant: 'destructive' })).toContain(
      'bg-destructive',
    )
    expect(buttonVariants({ variant: 'outline' })).toContain('bg-background')
    expect(buttonVariants({ variant: 'secondary' })).toContain('bg-secondary')
    expect(buttonVariants({ variant: 'ghost' })).toContain('hover:bg-accent')
    expect(buttonVariants({ variant: 'link' })).toContain('underline-offset-4')
  })

  it('produces distinct size classes', () => {
    expect(buttonVariants({ size: 'default' })).toContain('h-9')
    expect(buttonVariants({ size: 'sm' })).toContain('h-8')
    expect(buttonVariants({ size: 'icon' })).toContain('size-9')
  })

  it('applies the resolved variant/size classes onto the rendered button', () => {
    render(
      <Button variant="default" size="default">
        Go
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('bg-primary')
  })

  it('composes onto an anchor via the render prop (asChild -> render)', () => {
    render(
      <Button
        render={<a href="/projects" />}
        nativeButton={false}
        variant="default"
      >
        Projects
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Projects' })
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/projects')
    expect(link).toHaveAttribute('data-slot', 'button')
    expect(link).toHaveClass('bg-primary')
  })
})
