import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Label } from '@bcordes/ui/components/label'

describe('Control labels', () => {
  it('names the intended editable control', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" placeholder="Your address" />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(
      screen.getByPlaceholderText('Your address'),
    )
  })
  it('activates its associated control when clicked', () => {
    const onClick = vi.fn()
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" onClick={onClick} />
      </>,
    )
    fireEvent.click(screen.getByText('Email'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
