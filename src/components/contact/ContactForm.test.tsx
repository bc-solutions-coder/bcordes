import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { ContactForm } from './ContactForm'
import { renderWithProviders } from '@/test/helpers/render'

const mockSubmitInquiry = vi.fn()

vi.mock('~/server-fns/inquiries', () => ({
  submitInquiry: (...args: Array<unknown>) => mockSubmitInquiry(...args),
}))

vi.mock('~/hooks/useUser', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Radix Select uses scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn()

// Radix Select uses hasPointerCapture/setPointerCapture/releasePointerCapture
Element.prototype.hasPointerCapture = vi.fn()
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders all form fields', () => {
    renderWithProviders(<ContactForm />)

    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Phone/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Company/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Message/)).toBeInTheDocument()
    // Select fields render as comboboxes
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes).toHaveLength(3)
    // Labels for select fields
    expect(screen.getByText(/Project Type/)).toBeInTheDocument()
    expect(screen.getByText(/Budget Range/)).toBeInTheDocument()
    expect(screen.getByText(/Timeline/)).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    renderWithProviders(<ContactForm />)

    expect(
      screen.getByRole('button', { name: 'Send Message' }),
    ).toBeInTheDocument()
  })

  it('shows validation errors when submitted with empty required fields', async () => {
    renderWithProviders(<ContactForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Message is required')).toBeInTheDocument()
    expect(screen.getByText('Please select a project type')).toBeInTheDocument()
    expect(screen.getByText('Please select a budget range')).toBeInTheDocument()
    expect(screen.getByText('Please select a timeline')).toBeInTheDocument()
  })

  it('shows success message after successful submission', async () => {
    mockSubmitInquiry.mockResolvedValueOnce({
      id: '123',
      status: 'new',
    })

    renderWithProviders(<ContactForm />)

    // Fill in text fields
    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: 'john@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Message/), {
      target: { value: 'This is a test message for the form.' },
    })

    // Select fields via Radix Select comboboxes
    const comboboxes = screen.getAllByRole('combobox')

    // Project Type
    fireEvent.click(comboboxes[0])
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Frontend Development' }),
      ).toBeInTheDocument()
    })
    fireEvent.click(
      screen.getByRole('option', { name: 'Frontend Development' }),
    )

    // Budget Range
    fireEvent.click(comboboxes[1])
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: '$5k - $15k' }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('option', { name: '$5k - $15k' }))

    // Timeline
    fireEvent.click(comboboxes[2])
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: '1 - 3 months' }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('option', { name: '1 - 3 months' }))

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))

    await waitFor(() => {
      expect(screen.getByText('Message Sent!')).toBeInTheDocument()
    })

    expect(mockSubmitInquiry).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('button', { name: 'Send Another Message' }),
    ).toBeInTheDocument()
  })
})
