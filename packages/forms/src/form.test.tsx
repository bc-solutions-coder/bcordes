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
} from '@bcordes/forms'

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

describe('Accessible form submission', () => {
  it('names the editable control through its label', () => {
    render(<TestForm />)
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(
      screen.getByPlaceholderText('you@example.com'),
    )
  })

  it('describes a valid control with its help text', () => {
    render(<TestForm />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toHaveAccessibleDescription('We never share your email.')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('describes an invalid control with both help and error text', async () => {
    render(<TestForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await screen.findByText('Email is required')
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(
      'We never share your email. Email is required',
    )
  })

  it('shows the required error only after an invalid submission', async () => {
    render(<TestForm />)
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(await screen.findByText('Email is required')).toBeVisible()
  })

  it('rejects empty input, then submits the corrected value and clears the error', async () => {
    const onSubmit = vi.fn()
    render(<TestForm onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await screen.findByText('Email is required')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'reader@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ email: 'reader@example.com' })
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'aria-invalid',
      'false',
    )
    expect(
      screen.getByRole('textbox', { name: 'Email' }),
    ).toHaveAccessibleDescription('We never share your email.')
  })

  it('throws when the field hook has no form context', () => {
    function Consumer() {
      useFormField()
      return null
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<Consumer />)).toThrow()
    } finally {
      spy.mockRestore()
    }
  })
})
