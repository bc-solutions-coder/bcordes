import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

function renderSelect(props?: {
  defaultOpen?: boolean
  defaultValue?: string
}) {
  return render(
    <Select defaultOpen={props?.defaultOpen} defaultValue={props?.defaultValue}>
      <SelectTrigger>
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Apple">Apple</SelectItem>
        <SelectItem value="Banana">Banana</SelectItem>
      </SelectContent>
    </Select>,
  )
}

describe('Select (Radix -> Base UI migration contract)', () => {
  it('renders the placeholder in the trigger while nothing is selected', () => {
    renderSelect()
    const trigger = document.querySelector('[data-slot="select-trigger"]')
    expect(trigger).not.toBeNull()
    expect(trigger).toHaveTextContent('Pick a fruit')
  })

  it('shows options with data-slot="select-item" and option role when open', () => {
    renderSelect({ defaultOpen: true })
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThanOrEqual(2)
    expect(options[0]).toHaveAttribute('data-slot', 'select-item')
  })

  it('marks the selected item with the data-selected attribute', () => {
    renderSelect({ defaultOpen: true, defaultValue: 'Apple' })
    const selected = screen
      .getByRole('option', { name: 'Apple' })
      .closest('[data-slot="select-item"]')
    expect(selected).toHaveAttribute('data-selected')
  })

  it('updates the displayed value when an option is chosen', async () => {
    renderSelect()
    fireEvent.click(screen.getByText('Pick a fruit'))
    fireEvent.click(await screen.findByRole('option', { name: 'Banana' }))
    await waitFor(() => {
      const trigger = document.querySelector('[data-slot="select-trigger"]')
      expect(trigger).toHaveTextContent('Banana')
    })
  })

  it('renders the popup content with data-slot="select-content"', () => {
    renderSelect({ defaultOpen: true })
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).not.toBeNull()
  })
})
