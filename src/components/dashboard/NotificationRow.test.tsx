import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { NotificationRow } from './NotificationRow'
import type { Notification } from '@/lib/wallow/types'
import { renderWithProviders } from '@/test/helpers/render'

vi.mock('@/lib/format', () => ({
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}))

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'inquiry',
    title: 'New Inquiry',
    message: 'Someone submitted a contact form',
    isRead: false,
    readAt: null,
    createdAt: '2026-03-25T00:00:00Z',
    updatedAt: '2026-03-25T00:00:00Z',
    ...overrides,
  }
}

const defaultProps = () => ({
  notification: makeNotification(),
  selectedIds: new Set<string>() as ReadonlySet<string>,
  typeConfig: {},
  onSelect: vi.fn(),
  onClick: vi.fn(),
})

describe('NotificationRow', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders notification title and message', () => {
    const props = defaultProps()
    renderWithProviders(<NotificationRow {...props} />)

    expect(screen.getByText('New Inquiry')).toBeInTheDocument()
    expect(
      screen.getByText('Someone submitted a contact form'),
    ).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })

  it('calls onClick when the row is clicked', () => {
    const props = defaultProps()
    renderWithProviders(<NotificationRow {...props} />)

    fireEvent.click(screen.getByRole('button'))
    expect(props.onClick).toHaveBeenCalledWith(props.notification)
  })

  it('calls onClick when Enter key is pressed', () => {
    const props = defaultProps()
    renderWithProviders(<NotificationRow {...props} />)

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(props.onClick).toHaveBeenCalledWith(props.notification)
  })

  it('calls onClick when Space key is pressed', () => {
    const props = defaultProps()
    renderWithProviders(<NotificationRow {...props} />)

    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(props.onClick).toHaveBeenCalledWith(props.notification)
  })

  it('does not call onClick for other keys', () => {
    const props = defaultProps()
    renderWithProviders(<NotificationRow {...props} />)

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' })
    expect(props.onClick).not.toHaveBeenCalled()
  })

  it('shows unread indicator for unread notifications', () => {
    const props = defaultProps()
    renderWithProviders(<NotificationRow {...props} />)

    const title = screen.getByText('New Inquiry')
    expect(title.className).toContain('font-semibold')
  })

  it('does not show unread indicator for read notifications', () => {
    const props = {
      ...defaultProps(),
      notification: makeNotification({ isRead: true }),
    }
    renderWithProviders(<NotificationRow {...props} />)

    const title = screen.getByText('New Inquiry')
    expect(title.className).toContain('font-medium')
    expect(title.className).not.toContain('font-semibold')
  })

  it('calls onSelect when checkbox is toggled', () => {
    const props = defaultProps()
    renderWithProviders(<NotificationRow {...props} />)

    const checkbox = screen.getByRole('checkbox', {
      name: /select notification/i,
    })
    fireEvent.click(checkbox)
    expect(props.onSelect).toHaveBeenCalledWith('notif-1', true)
  })
})
