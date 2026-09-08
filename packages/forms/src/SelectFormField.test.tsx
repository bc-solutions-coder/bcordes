import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form, SelectFormField } from '@bcordes/forms'

const options = [
  { value: 'web', label: 'Web App' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'api', label: 'API Integration' },
] as const

function Harness({
  required,
  onSubmit = () => {},
}: {
  required?: boolean
  onSubmit?: (value: { projectType: string }) => void
}) {
  const form = useForm({ defaultValues: { projectType: '' } })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <SelectFormField
          control={form.control}
          name="projectType"
          label="Project Type"
          placeholder="Select project type"
          options={options}
          required={required}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

describe('Project type form selection', () => {
  it('names the selection control and shows its placeholder', () => {
    render(<Harness />)
    expect(
      screen.getByRole('combobox', { name: 'Project Type' }),
    ).toHaveTextContent('Select project type')
  })
  it('shows the required indicator only when requested', () => {
    const { unmount } = render(<Harness required />)
    expect(screen.getByText('*')).toBeVisible()
    unmount()
    render(<Harness />)
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })
  it('offers every supplied option', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Project Type' }))
    for (const option of options)
      expect(
        await screen.findByRole('option', { name: option.label }),
      ).toBeVisible()
  })
  it('displays and submits the chosen option value', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Project Type' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Mobile App' }))
    expect(
      screen.getByRole('combobox', { name: 'Project Type' }),
    ).toHaveTextContent('mobile')
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ projectType: 'mobile' })
  })
})
