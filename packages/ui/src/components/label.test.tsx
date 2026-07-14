import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Label } from './label'

// Contract net for the Radix -> native <label> migration (Base UI has no
// standalone Label primitive). The public API/DOM must stay identical so
// form.tsx can keep importing `Label` from this file:
//   renders a <label>, data-slot="label", htmlFor wiring focuses the control,
//   peer-disabled styling classes preserved, className merged.
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
    // jsdom does not implement browser focus-on-label-click, but it does
    // forward the label activation click to the associated control. That
    // forwarding is the preservable contract of the htmlFor wiring.
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
