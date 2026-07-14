import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { ContactFormSuccess } from './ContactFormSuccess'
import { renderWithProviders } from '@/test/helpers/render'

describe('ContactFormSuccess', () => {
  it('renders success message', () => {
    renderWithProviders(<ContactFormSuccess onSendAnother={vi.fn()} />)

    expect(screen.getByText('Message Sent!')).toBeInTheDocument()
    expect(screen.getByText(/Thanks for reaching out/)).toBeInTheDocument()
  })

  it('renders Send Another Message button', () => {
    renderWithProviders(<ContactFormSuccess onSendAnother={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'Send Another Message' }),
    ).toBeInTheDocument()
  })

  it('calls onSendAnother when button is clicked', () => {
    const onSendAnother = vi.fn()
    renderWithProviders(<ContactFormSuccess onSendAnother={onSendAnother} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Send Another Message' }),
    )
    expect(onSendAnother).toHaveBeenCalledOnce()
  })
})
