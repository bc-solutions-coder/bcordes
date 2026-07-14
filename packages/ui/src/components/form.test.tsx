import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Input } from './input'

// Contract net for the Radix Slot -> React.cloneElement migration in
// FormControl (and the LabelPrimitive -> ./label type swap in FormLabel).
// The public API/DOM/aria wiring must stay identical after removing
// @radix-ui/react-slot so react-hook-form + accessibility keep working:
//   - FormControl forwards the generated id onto its child input, and
//     FormLabel's htmlFor matches it (label <-> control association).
//   - aria-describedby links the input to FormDescription (no error) and to
//     both FormDescription + FormMessage on error.
//   - On a validation error the input gets aria-invalid="true" and
//     FormMessage renders the error text.
//   - FormControl adds NO extra wrapper DOM node around the input (Slot merged
//     props onto the single child; cloneElement must do the same).
//   - The public API (7 exports) is unchanged.
//
// Because the plan preserves the public API, these assertions PASS against the
// current Radix impl on purpose — they are the regression net that proves the
// migration does not break rhf/aria wiring.

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

    // FormControl merged the generated id onto the actual <input>.
    expect(input).toHaveAttribute('id')
    expect(input.getAttribute('id')).toMatch(/-form-item$/)

    // FormLabel's htmlFor points at that same id (label <-> control wiring).
    expect(label).toHaveAttribute('for', input.getAttribute('id'))

    // getByLabelText resolves the input via the association.
    expect(screen.getByLabelText('Email')).toBe(input)
  })

  it('renders the input directly with no extra wrapper node (Slot semantics)', () => {
    render(<TestForm />)

    const input = screen.getByPlaceholderText('you@example.com')

    // FormControl must not introduce a DOM node of its own: data-slot and the
    // id/aria attrs land on the <input> itself.
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('data-slot', 'form-control')

    // The FormItem grid <div> is the input's direct parent — there is no
    // intermediate FormControl wrapper element.
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

    // FormMessage renders the resolver error text.
    const message = await screen.findByText('Email is required')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute(
      'aria-describedby',
      `${description.id} ${message.id}`,
    )
    // Message id follows the derived pattern and is wired to the input.
    expect(message).toHaveAttribute('data-slot', 'form-message')
    expect(message.id).toMatch(/-form-item-message$/)
  })

  it('renders no FormMessage node until there is an error', async () => {
    render(<TestForm />)

    // No error yet -> FormMessage returns null.
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
