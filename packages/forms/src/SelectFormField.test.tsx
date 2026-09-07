import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form } from './form'
import { SelectFormField } from './SelectFormField'

const options = [
  { value: 'web', label: 'Web App' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'api', label: 'API Integration' },
] as const

interface HarnessValues {
  projectType: string
}

function Harness(props: {
  required?: boolean
  triggerClassName?: string
  contentClassName?: string
}) {
  const form = useForm<HarnessValues>({
    defaultValues: { projectType: '' },
  })

  return (
    <Form {...form}>
      <SelectFormField
        control={form.control}
        name="projectType"
        label="Project Type"
        placeholder="Select project type"
        options={options}
        required={props.required}
        triggerClassName={props.triggerClassName}
        contentClassName={props.contentClassName}
      />
      <span data-testid="field-value">{form.watch('projectType')}</span>
    </Form>
  )
}

describe('SelectFormField (generalized, @bcordes/forms)', () => {
  it('is re-exported from the package barrel entry point', async () => {
    const mod = await import('./index')
    expect(mod.SelectFormField).toBeDefined()
    expect(typeof mod.SelectFormField).toBe('function')
  })

  it('renders the label', () => {
    render(<Harness />)
    expect(screen.getByText('Project Type')).toBeInTheDocument()
  })

  it('renders the required asterisk when required, and omits it otherwise', () => {
    const { unmount } = render(<Harness required />)
    expect(screen.getByText('*')).toBeInTheDocument()
    unmount()

    render(<Harness />)
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('renders every option when opened', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('Select project type'))

    for (const option of options) {
      expect(
        await screen.findByRole('option', { name: option.label }),
      ).toBeInTheDocument()
    }
  })

  it('propagates the chosen value through the react-hook-form field (onChange)', async () => {
    render(<Harness />)

    fireEvent.click(screen.getByText('Select project type'))
    fireEvent.click(await screen.findByRole('option', { name: 'Mobile App' }))

    // Observe the form value to verify React Hook Form receives the selection.
    await waitFor(() => {
      expect(screen.getByTestId('field-value')).toHaveTextContent('mobile')
    })
  })

  it('applies a custom triggerClassName when supplied', () => {
    render(<Harness triggerClassName="my-custom-trigger" />)

    const trigger = screen.getByRole('combobox')
    expect(trigger).not.toBeNull()
    expect(trigger).toHaveClass('my-custom-trigger')
  })
})
