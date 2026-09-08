import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from '@bcordes/ui/components/progress'

describe('Progress value', () => {
  it('reports the supplied value within its zero-to-one-hundred range', () => {
    const { rerender } = render(<Progress value={40} aria-label="Upload" />)
    const progress = screen.getByRole('progressbar', { name: 'Upload' })
    expect(progress).toHaveAttribute('aria-valuenow', '40')
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    rerender(<Progress value={100} aria-label="Upload" />)
    expect(progress).toHaveAttribute('aria-valuenow', '100')
  })
})
