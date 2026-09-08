import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@bcordes/ui/components/badge'

describe('Badge content', () => {
  it('shows static content without presenting an action', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('preserves a supplied link destination', () => {
    render(<Badge render={<a href="/projects" />}>Projects</Badge>)
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    )
  })
})
