import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from './sheet'

// Contract net for the @radix-ui/react-dialog -> Base UI
// (@base-ui/react/dialog) migration of the sheet wrapper.
// Preserved: data-slot="sheet-content"/"sheet-title"/"sheet-description" on
//   each part, role="dialog", trigger opens the sheet, an accessible close
//   button named "Close" dismisses it, Escape closes.
// Changed (drives the migration): SheetPrimitive.Overlay -> Backdrop and
//   SheetPrimitive.Content -> Popup, and the `side` variant is now reflected
//   as a stable data-side attribute on the content element (Radix expressed it
//   only via slide-in-from-* animation classes tied to data-[state=*]). We
//   assert the NEW, stable contract: data-side="top|right|bottom|left".
type Side = 'top' | 'right' | 'bottom' | 'left'

function renderSheet(props?: { open?: boolean; side?: Side }) {
  return render(
    <Sheet defaultOpen={props?.open ?? true}>
      <SheetTrigger>Open sheet</SheetTrigger>
      <SheetContent side={props?.side}>
        <SheetTitle>Sheet title</SheetTitle>
        <SheetDescription>Sheet description</SheetDescription>
        <p>Sheet body</p>
      </SheetContent>
    </Sheet>,
  )
}

describe('Sheet (Radix -> Base UI migration contract)', () => {
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

  it('renders content, title and description with their data-slots', () => {
    renderSheet()
    const content = screen
      .getByText('Sheet body')
      .closest('[data-slot="sheet-content"]')
    expect(content).not.toBeNull()
    expect(screen.getByText('Sheet title')).toHaveAttribute(
      'data-slot',
      'sheet-title',
    )
    expect(screen.getByText('Sheet description')).toHaveAttribute(
      'data-slot',
      'sheet-description',
    )
  })

  it('defaults to the right side (data-side="right")', () => {
    renderSheet()
    const content = screen
      .getByText('Sheet body')
      .closest('[data-slot="sheet-content"]')
    expect(content).toHaveAttribute('data-side', 'right')
  })

  it.each<Side>(['top', 'right', 'bottom', 'left'])(
    'honors the side prop via a stable data-side attribute (%s)',
    (side) => {
      renderSheet({ side })
      const content = screen
        .getByText('Sheet body')
        .closest('[data-slot="sheet-content"]')
      expect(content).toHaveAttribute('data-side', side)
    },
  )

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
