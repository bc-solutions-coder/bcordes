import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@bcordes/ui/components/dialog'

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

describe('Dialog', () => {
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

  it('names and describes the dialog and exposes its body', () => {
    renderDialog()
    expect(
      screen.getByRole('dialog', { name: 'Dialog title' }),
    ).toHaveAccessibleDescription('Dialog description')
    expect(screen.getByText('Dialog body')).toBeVisible()
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
