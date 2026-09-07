import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Label } from './label'

describe('Label (Radix -> native migration contract)', () => {
  it('renders a <label> element with data-slot="label"', () => {
    render(<Label>Email</Label>)
    const label = screen.getByText('Email')
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('data-slot', 'label')
  })

  it('wires htmlFor to associate with a control', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    )
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email')
  })

  it('activates its associated control when clicked (label -> control wiring)', () => {
    // jsdom forwards label clicks to the control but does not focus it.
    const onClick = vi.fn()
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" onClick={onClick} />
      </>,
    )
    fireEvent.click(screen.getByText('Email'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('preserves peer-disabled styling classes', () => {
    render(<Label>Email</Label>)
    const label = screen.getByText('Email')
    expect(label).toHaveClass('peer-disabled:opacity-50')
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed')
  })

  it('merges caller className', () => {
    render(<Label className="text-red-500">Email</Label>)
    expect(screen.getByText('Email')).toHaveClass('text-red-500')
  })
})
