import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ContactFormFields } from './ContactFormFields'
import { contactFormSchema } from './contact-form.schema'
import type { ContactFormValues } from './contact-form.schema'
import { renderWithProviders } from '@/test/helpers/render'

// Radix Select polyfills for jsdom
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.hasPointerCapture = vi.fn()
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()

function TestWrapper({
  disabledFields,
}: {
  disabledFields?: { name?: boolean; email?: boolean }
}) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      projectType: undefined,
      budgetRange: undefined,
      timeline: undefined,
      message: '',
    },
  })

  return (
    <ContactFormFields
      form={form}
      onSubmit={vi.fn()}
      isSubmitting={false}
      disabledFields={disabledFields}
    />
  )
}

describe('ContactFormFields', () => {
  it('renders all form fields', () => {
    renderWithProviders(<TestWrapper />)

    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Phone/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Company/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Message/)).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
  })

  it('renders the submit button', () => {
    renderWithProviders(<TestWrapper />)

    expect(
      screen.getByRole('button', { name: 'Send Message' }),
    ).toBeInTheDocument()
  })

  it('disables name and email fields when disabledFields is set', () => {
    renderWithProviders(
      <TestWrapper disabledFields={{ name: true, email: true }} />,
    )

    expect(screen.getByLabelText(/^Name/)).toBeDisabled()
    expect(screen.getByLabelText(/^Email/)).toBeDisabled()
  })

  it('does not disable fields when disabledFields is not set', () => {
    renderWithProviders(<TestWrapper />)

    expect(screen.getByLabelText(/^Name/)).not.toBeDisabled()
    expect(screen.getByLabelText(/^Email/)).not.toBeDisabled()
  })
})
