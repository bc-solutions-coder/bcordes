import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'

// Contract net for the Radix -> Base UI (@base-ui/react/avatar) migration.
// Preserved (three-part structure is identical in Base UI):
//   data-slot="avatar" / "avatar-image" / "avatar-fallback",
//   base classes on the root, className merge, stable exports,
//   fallback shows its children when the image is absent/unavailable
//   (Base UI manages show/hide internally; the Radix delayMs prop is dropped).
describe('Avatar (Radix -> Base UI migration contract)', () => {
  it('renders root with data-slot="avatar" and base classes', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    )
    const root = container.querySelector('[data-slot="avatar"]')
    expect(root).not.toBeNull()
    expect(root).toHaveClass('relative')
    expect(root).toHaveClass('rounded-full')
  })

  it('renders the fallback (data-slot="avatar-fallback") with its children when no image', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    )
    const fallback = screen.getByText('AB')
    expect(fallback).toHaveAttribute('data-slot', 'avatar-fallback')
  })

  it('keeps showing the fallback when the image source fails to load', async () => {
    render(
      <Avatar>
        <AvatarImage src="/does-not-exist.png" alt="broken" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    )
    const fallback = await screen.findByText('AB')
    expect(fallback).toHaveAttribute('data-slot', 'avatar-fallback')
  })

  it('exports Avatar, AvatarImage, AvatarFallback with a stable API', () => {
    expect(typeof Avatar).toBe('function')
    expect(typeof AvatarImage).toBe('function')
    expect(typeof AvatarFallback).toBe('function')
  })

  it('merges caller className on the root', () => {
    const { container } = render(
      <Avatar className="ring-2">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    )
    expect(container.querySelector('[data-slot="avatar"]')).toHaveClass(
      'ring-2',
    )
  })
})
