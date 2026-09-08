import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@bcordes/test-utils'
import { NotificationRow } from './NotificationRow'
import type { Notification } from '@bcordes/wallow/types'

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'inquiry',
    title: 'New Inquiry',
    message: 'Someone submitted a contact form',
    isRead: false,
    readAt: null,
    actionUrl: null,
    createdAt: '2026-03-25T00:00:00Z',
    updatedAt: '2026-03-25T00:00:00Z',
    ...overrides,
  }
}
function props() {
  return {
    notification: makeNotification(),
    selectedIds: new Set<string>(),
    typeConfig: {},
    onSelect: vi.fn(),
    onClick: vi.fn(),
  }
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-03-25T02:00:00Z'))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it.each([
  { createdAt: '2026-03-25T00:00:00Z', relative: '2h ago' },
  { createdAt: '2026-03-25T01:59:40Z', relative: 'just now' },
])(
  'shows the title, message and $relative timestamp for $createdAt',
  ({ createdAt, relative }) => {
    const row = props()
    renderWithProviders(
      <NotificationRow
        {...row}
        notification={makeNotification({ createdAt })}
      />,
    )
    expect(screen.getByText('New Inquiry')).toBeVisible()
    expect(screen.getByText('Someone submitted a contact form')).toBeVisible()
    expect(screen.getByText(relative)).toBeVisible()
  },
)
it.each(['click', 'Enter', ' '])(
  'activates the notification through %j',
  (activation) => {
    const row = props()
    renderWithProviders(<NotificationRow {...row} />)
    const button = screen.getByRole('button')
    if (activation === 'click') fireEvent.click(button)
    else fireEvent.keyDown(button, { key: activation })
    expect(row.onClick.mock.calls).toEqual([[row.notification]])
  },
)
it('does not activate the notification when Tab is pressed', () => {
  const row = props()
  renderWithProviders(<NotificationRow {...row} />)
  fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' })
  expect(row.onClick).not.toHaveBeenCalled()
})
it('selects and deselects the same notification without activating its row', () => {
  const row = props()
  const { rerender } = renderWithProviders(<NotificationRow {...row} />)
  const checkbox = screen.getByRole('checkbox', {
    name: 'Select notification: New Inquiry',
  })
  expect(checkbox).not.toBeChecked()
  fireEvent.click(checkbox)
  expect(row.onSelect.mock.calls).toEqual([['notif-1', true]])
  expect(row.onClick).not.toHaveBeenCalled()
  rerender(<NotificationRow {...row} selectedIds={new Set(['notif-1'])} />)
  expect(checkbox).toBeChecked()
  fireEvent.click(checkbox)
  expect(row.onSelect.mock.calls).toEqual([
    ['notif-1', true],
    ['notif-1', false],
  ])
  expect(row.onClick).not.toHaveBeenCalled()
  rerender(<NotificationRow {...row} selectedIds={new Set()} />)
  expect(checkbox).not.toBeChecked()
})
