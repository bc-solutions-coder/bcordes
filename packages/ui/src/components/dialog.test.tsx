import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog'

function renderDialog(props?: { showCloseButton?: boolean; open?: boolean }) {
  return render(
    <Dialog defaultOpen={props?.open ?? true}>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent showCloseButton={props?.showCloseButton}>
        <DialogTitle>Dialog title</DialogTitle>
        <DialogDescription>Dialog description</DialogDescription>
        <p>Dialog body</p>
      </DialogContent>
    </Dialog>,
  )
}

describe('Dialog (Radix -> Base UI migration contract)', () => {
  it('opens from the trigger and exposes role="dialog"', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByText('Open dialog'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('renders content, title and description with their data-slots', () => {
    renderDialog()
    const content = screen
      .getByText('Dialog body')
      .closest('[data-slot="dialog-content"]')
    expect(content).not.toBeNull()
    expect(screen.getByText('Dialog title')).toHaveAttribute(
      'data-slot',
      'dialog-title',
    )
    expect(screen.getByText('Dialog description')).toHaveAttribute(
      'data-slot',
      'dialog-description',
    )
  })

  it('renders the close button (data-slot="dialog-close") when showCloseButton is true', () => {
    renderDialog({ showCloseButton: true })
    const close = screen.getByRole('button', { name: /close/i })
    expect(close).toHaveAttribute('data-slot', 'dialog-close')
  })

  it('omits the close button when showCloseButton is false', () => {
    renderDialog({ showCloseButton: false })
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })

  it('closes when Escape is pressed', async () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('closes when the close button is clicked', async () => {
    renderDialog({ showCloseButton: true })
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
