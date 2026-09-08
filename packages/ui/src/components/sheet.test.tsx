import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@bcordes/ui/components/sheet'

function renderSheet(props?: { open?: boolean }) {
  return render(
    <Sheet defaultOpen={props?.open ?? true}>
      <SheetTrigger>Open sheet</SheetTrigger>
      <SheetContent>
        <SheetTitle>Sheet title</SheetTitle>
        <SheetDescription>Sheet description</SheetDescription>
        <p>Sheet body</p>
      </SheetContent>
    </Sheet>,
  )
}

describe('Sheet', () => {
  it('opens from the trigger and exposes role="dialog"', async () => {
    render(
      <Sheet>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>
          <SheetTitle>Sheet title</SheetTitle>
          <SheetDescription>Sheet description</SheetDescription>
        </SheetContent>
      </Sheet>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByText('Open sheet'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('names and describes the sheet and exposes its body', () => {
    renderSheet()
    expect(
      screen.getByRole('dialog', { name: 'Sheet title' }),
    ).toHaveAccessibleDescription('Sheet description')
    expect(screen.getByText('Sheet body')).toBeVisible()
  })

  it('closes when the close button is clicked', async () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('closes when Escape is pressed', async () => {
    renderSheet()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
