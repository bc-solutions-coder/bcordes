import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from './progress'

describe('Progress (Radix -> Base UI migration contract)', () => {
  it('renders root with data-slot="progress"', () => {
    const { container } = render(<Progress value={40} />)
    expect(container.querySelector('[data-slot="progress"]')).not.toBeNull()
  })

  it('exposes progressbar semantics reflecting the value (0-100)', () => {
    render(<Progress value={40} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('renders a track wrapper with data-slot="progress-track"', () => {
    const { container } = render(<Progress value={40} />)
    expect(
      container.querySelector('[data-slot="progress-track"]'),
    ).not.toBeNull()
  })

  it('renders an indicator with data-slot="progress-indicator"', () => {
    const { container } = render(<Progress value={40} />)
    expect(
      container.querySelector('[data-slot="progress-indicator"]'),
    ).not.toBeNull()
  })

  it('drives indicator width from value via inline width, not a manual translateX transform', () => {
    const { container } = render(<Progress value={60} />)
    const indicator = container.querySelector(
      '[data-slot="progress-indicator"]',
    ) as HTMLElement
    expect(indicator.style.width).toBe('60%')
    expect(indicator.style.transform).toBe('')
  })

  it('preserves the indicator accent class (bg-primary)', () => {
    const { container } = render(<Progress value={20} />)
    expect(
      container.querySelector('[data-slot="progress-indicator"]'),
    ).toHaveClass('bg-primary')
  })
})
