import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { renderWithProviders } from '@bcordes/test-utils'
import { contactFormSchema } from '../lib/contact-form.schema'
import { ContactFormFields } from './ContactFormFields'
import type { ContactFormValues } from '../lib/contact-form.schema'

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
