import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@bcordes/ui/components/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from './form'

const schema = z.object({
  email: z.string().min(1, 'Email is required'),
})

type FormValues = z.infer<typeof schema>

function TestForm({ onSubmit }: { onSubmit?: (values: FormValues) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit ?? (() => {}))}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>We never share your email.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

describe('form (Radix Slot -> cloneElement migration contract)', () => {
  it('exposes all 7 public exports', async () => {
    const mod = await import('./form')
    for (const name of [
      'Form',
      'FormItem',
      'FormLabel',
      'FormControl',
      'FormDescription',
      'FormMessage',
      'FormField',
      'useFormField',
    ]) {
      expect(mod[name as keyof typeof mod]).toBeDefined()
    }
  })

  it('forwards the generated id to the child input and matches label htmlFor', () => {
    render(<TestForm />)

    const input = screen.getByPlaceholderText('you@example.com')
    const label = screen.getByText('Email')

    expect(input).toHaveAttribute('id')
    expect(input.getAttribute('id')).toMatch(/-form-item$/)

    expect(label).toHaveAttribute('for', input.getAttribute('id'))

    expect(screen.getByLabelText('Email')).toBe(input)
  })

  it('renders the input directly with no extra wrapper node (Slot semantics)', () => {
    render(<TestForm />)

    const input = screen.getByPlaceholderText('you@example.com')

    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('data-slot', 'form-control')

    const item = input.closest('[data-slot="form-item"]')
    expect(item).not.toBeNull()
    expect(input.parentElement).toBe(item)
  })

  it('links aria-describedby to the description when there is no error', () => {
    render(<TestForm />)

    const input = screen.getByPlaceholderText('you@example.com')
    const description = screen.getByText('We never share your email.')

    expect(input).toHaveAttribute('aria-describedby', description.id)
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('sets aria-invalid and extends aria-describedby to the message on error', async () => {
    render(<TestForm />)

    const input = screen.getByPlaceholderText('you@example.com')
    const description = screen.getByText('We never share your email.')

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    const message = await screen.findByText('Email is required')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute(
      'aria-describedby',
      `${description.id} ${message.id}`,
    )

    expect(message).toHaveAttribute('data-slot', 'form-message')
    expect(message.id).toMatch(/-form-item-message$/)
  })

  it('renders no FormMessage node until there is an error', async () => {
    render(<TestForm />)

    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() =>
      expect(screen.getByText('Email is required')).toBeInTheDocument(),
    )
  })

  it('does not call onSubmit while the field is invalid', async () => {
    const onSubmit = vi.fn()
    render(<TestForm onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await screen.findByText('Email is required')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('useFormField throws a clear error outside a FormField provider', () => {
    function Consumer() {
      useFormField()
      return null
    }

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow()
    spy.mockRestore()
  })
})
