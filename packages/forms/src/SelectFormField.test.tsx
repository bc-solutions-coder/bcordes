import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form } from './form'
import { SelectFormField } from './SelectFormField'

// Acceptance net for T10.2: SelectFormField generalized and moved into
// @bcordes/forms. The component is decoupled from any app-specific option or
// value type — it is generic over TFieldValues (react-hook-form) and takes a
// plain { value, label } option list, so the contact form and any future app
// share one implementation. The ONLY behavior change is that the hardcoded
// bcordes theme classes become overridable via triggerClassName/contentClassName
// (defaulting to the current values, so existing call sites render identically).
//
// These assertions fail against the RED scaffold (which renders null) and are
// satisfied once GREEN git-mv's the real component in and wires the className
// overrides.

const options = [
  { value: 'web', label: 'Web App' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'api', label: 'API Integration' },
] as const

// A field-value shape with no contact-page coupling — proves the generic works
// for an arbitrary consumer, not just ContactFormValues.
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

    // FormControl wraps the trigger and (per the frozen form.test.tsx spec)
    // the @bcordes/ui Select renders no label into the trigger without an
    // `items` prop — so assert value propagation against the rhf field itself.
    await waitFor(() => {
      expect(screen.getByTestId('field-value')).toHaveTextContent('mobile')
    })
  })

  it('applies a custom triggerClassName when supplied', () => {
    render(<Harness triggerClassName="my-custom-trigger" />)
    // FormControl's cloneElement overrides the child data-slot to
    // 'form-control', so target the combobox trigger by role.
    const trigger = screen.getByRole('combobox')
    expect(trigger).not.toBeNull()
    expect(trigger).toHaveClass('my-custom-trigger')
  })
})
