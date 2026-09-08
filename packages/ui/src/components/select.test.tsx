import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bcordes/ui/components/select'

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

describe('Select', () => {
  it('shows a placeholder before selection', () => {
    renderSelect()
    expect(screen.getByRole('combobox')).toHaveTextContent('Pick a fruit')
  })

  it('shows the supplied options in an open listbox', () => {
    renderSelect({ defaultOpen: true })
    expect(screen.getByRole('listbox')).toBeVisible()
    expect(screen.getByRole('option', { name: 'Apple' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Banana' })).toBeVisible()
  })

  it('reports the selected option and displays its value', () => {
    renderSelect({ defaultOpen: true, defaultValue: 'Apple' })
    expect(
      screen.getByRole('option', { name: 'Apple', selected: true }),
    ).toBeVisible()
    expect(
      screen.getByRole('option', { name: 'Banana', selected: false }),
    ).toBeVisible()
    expect(screen.getByRole('combobox')).toHaveTextContent('Apple')
  })

  it('displays the chosen value and closes the list', async () => {
    renderSelect()
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Banana' }))
    await waitFor(() =>
      expect(screen.getByRole('combobox')).toHaveTextContent('Banana'),
    )
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
