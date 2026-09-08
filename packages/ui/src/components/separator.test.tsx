import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Separator } from '@bcordes/ui/components/separator'

describe('Separator semantics', () => {
  it('defaults to horizontal separation', () => {
    render(<Separator />)
    expect(
      screen.getByRole('separator').getAttribute('aria-orientation') ??
        'horizontal',
    ).toBe('horizontal')
  })
  it('reports vertical separation when requested', () => {
    render(<Separator orientation="vertical" />)
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    )
  })
})
