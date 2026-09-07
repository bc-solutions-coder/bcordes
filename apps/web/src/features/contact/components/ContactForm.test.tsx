import { createMockUser } from '@bcordes/auth/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Toaster } from 'sonner'
import { renderWithProviders } from '@bcordes/test-utils'
import { ContactForm } from './ContactForm'
import type { useUser } from '@/shared/auth'

const { submit, identity } = vi.hoisted(() => ({
  submit: vi.fn<(...args: Array<unknown>) => Promise<unknown>>(),
  identity: vi.fn<typeof useUser>(),
}))
vi.mock('@/features/inquiries', () => ({ submitInquiry: submit }))
vi.mock('@/shared/auth', () => ({ useUser: identity }))

beforeEach(() => {
  submit.mockReset().mockResolvedValue({ id: '123', status: 'new' })
  identity.mockReturnValue({ user: null, isLoading: false })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function showForm() {
  return renderWithProviders(
    <>
      <ContactForm />
      <Toaster />
    </>,
  )
}

async function enterInquiry() {
  for (const [label, value] of [
    ['Name', 'John Doe'],
    ['Email', 'john@example.com'],
    ['Message', 'Please build an accessible client portal.'],
  ])
    fireEvent.change(
      screen.getByRole('textbox', { name: new RegExp(`^${label}`) }),
      { target: { value } },
    )
  for (const [name, option] of [
    ['Project Type', 'Frontend Development'],
    ['Budget Range', '$5k - $15k'],
    ['Timeline', '1 - 3 months'],
  ]) {
    fireEvent.click(screen.getByRole('combobox', { name: new RegExp(name) }))
    fireEvent.click(await screen.findByRole('option', { name: option }))
  }
}
const inquiry = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '',
  company: undefined,
  projectType: 'Frontend',
  budgetRange: '$5k-$15k',
  timeline: '1-3 months',
  message: 'Please build an accessible client portal.',
}

describe('ContactForm', () => {
  it('offers labeled contact fields and project selectors', () => {
    showForm()
    for (const name of ['Name', 'Email', 'Phone', 'Company', 'Message']) {
      expect(
        screen.getByRole('textbox', { name: new RegExp(`^${name}`) }),
      ).toHaveValue('')
    }
    for (const name of ['Project Type', 'Budget Range', 'Timeline']) {
      expect(
        screen.getByRole('combobox', { name: new RegExp(name) }),
      ).toBeEnabled()
    }
  })

  it('shows required-field errors without submitting an empty form', async () => {
    showForm()
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))
    expect(await screen.findByText('Name is required')).toBeVisible()
    for (const message of [
      'Email is required',
      'Message is required',
      'Please select a project type',
      'Please select a budget range',
      'Please select a timeline',
    ]) {
      expect(screen.getByText(message)).toBeVisible()
    }
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled()
  })

  it('submits entered inquiry details and lets the visitor start another message', async () => {
    showForm()
    await enterInquiry()
    fireEvent.change(screen.getByRole('textbox', { name: 'Phone' }), {
      target: { value: '555-123-4567' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Company' }), {
      target: { value: 'Acme' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))
    expect(await screen.findByText('Message Sent!')).toBeVisible()
    expect(submit).toHaveBeenCalledExactlyOnceWith({
      data: { ...inquiry, phone: '555-123-4567', company: 'Acme' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Send Another Message' }),
    )
    for (const name of ['Name', 'Email', 'Phone', 'Company', 'Message']) {
      const field = screen.getByRole('textbox', {
        name: new RegExp(`^${name}`),
      })
      expect(field).toHaveValue('')
      expect(field).toBeEnabled()
    }
    for (const [name, placeholder] of [
      ['Project Type', 'Select project type'],
      ['Budget Range', 'Select budget range'],
      ['Timeline', 'Select timeline'],
    ]) {
      expect(
        screen.getByRole('combobox', { name: new RegExp(name) }),
      ).toHaveTextContent(placeholder)
    }
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled()
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('normalizes omitted optional fields when submitting a message', async () => {
    showForm()
    await enterInquiry()
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))
    expect(await screen.findByText('Message Sent!')).toBeVisible()
    expect(submit).toHaveBeenCalledExactlyOnceWith({ data: inquiry })
  })

  it('shows failure feedback and preserves entered details for retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    submit.mockRejectedValueOnce(new Error('Network error'))
    showForm()
    await enterInquiry()
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))
    expect(await screen.findByText('Failed to send message')).toBeVisible()
    expect(
      screen.getByText('Please try again or email me directly.'),
    ).toBeVisible()
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue(
      inquiry.name,
    )
    expect(screen.getByRole('textbox', { name: /^Email/ })).toHaveValue(
      inquiry.email,
    )
    expect(screen.getByRole('textbox', { name: /^Message/ })).toHaveValue(
      inquiry.message,
    )
    expect(screen.queryByText('Message Sent!')).not.toBeInTheDocument()
    const retry = screen.getByRole('button', { name: 'Send Message' })
    expect(retry).toBeEnabled()
    fireEvent.click(retry)
    expect(await screen.findByText('Message Sent!')).toBeVisible()
    expect(submit).toHaveBeenNthCalledWith(2, { data: inquiry })
  })

  it('disables submission and shows Sending while the request is pending', async () => {
    let complete: () => void = () => {
      throw new Error('Request has not started')
    }
    submit.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve
        }),
    )
    showForm()
    await enterInquiry()
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))
    expect(
      await screen.findByRole('button', { name: /Sending/ }),
    ).toBeDisabled()
    complete()
    expect(await screen.findByText('Message Sent!')).toBeVisible()
  })

  it('pre-fills and locks the signed-in name and email', async () => {
    identity.mockReturnValue({
      user: createMockUser({ email: 'jane@example.com', name: 'Jane Smith' }),
      isLoading: false,
    })
    showForm()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /^Email/ })).toHaveValue(
        'jane@example.com',
      ),
    )
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue(
      'Jane Smith',
    )
    expect(screen.getByRole('textbox', { name: /^Name/ })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /^Email/ })).toBeDisabled()
  })

  it('locks a known email while leaving a missing name editable', async () => {
    identity.mockReturnValue({
      user: createMockUser({ email: 'jane@example.com', name: '' }),
      isLoading: false,
    })
    showForm()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /^Email/ })).toHaveValue(
        'jane@example.com',
      ),
    )
    expect(screen.getByRole('textbox', { name: /^Email/ })).toBeDisabled()
    const name = screen.getByRole('textbox', { name: /^Name/ })
    expect(name).toBeEnabled()
    fireEvent.change(name, { target: { value: 'Jane Smith' } })
    expect(name).toHaveValue('Jane Smith')
  })

  it('locks a known name while leaving a missing email editable', async () => {
    identity.mockReturnValue({
      user: createMockUser({ email: '', name: 'Jane Smith' }),
      isLoading: false,
    })
    showForm()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue(
        'Jane Smith',
      ),
    )
    expect(screen.getByRole('textbox', { name: /^Name/ })).toBeDisabled()
    const email = screen.getByRole('textbox', { name: /^Email/ })
    expect(email).toBeEnabled()
    fireEvent.change(email, { target: { value: 'jane@example.com' } })
    expect(email).toHaveValue('jane@example.com')
  })
})
