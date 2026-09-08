import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useNotificationFilters } from './useNotificationFilters'
import type { Notification } from '@bcordes/wallow/types'

function makeNotification(
  overrides: Partial<Notification> & Pick<Notification, 'id'>,
): Notification {
  return {
    userId: 'user-1',
    type: 'TaskAssigned',
    title: 'Test',
    message: 'msg',
    isRead: false,
    readAt: null,
    actionUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const fixtures: Array<Notification> = [
  makeNotification({ id: '1', type: 'TaskAssigned', isRead: false }),
  makeNotification({ id: '2', type: 'TaskAssigned', isRead: true }),
  makeNotification({ id: '3', type: 'InquirySubmitted', isRead: false }),
  makeNotification({ id: '4', type: 'InquirySubmitted', isRead: true }),
]

describe('useNotificationFilters', () => {
  it('returns the full array when no filters are active', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))
    expect(result.current.filtered).toEqual(fixtures)
    expect(result.current.unreadOnly).toBe(false)
    expect(result.current.activeType).toBeNull()
  })

  it('shows only unread notifications from the loaded list', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    act(() => result.current.handleTabChange('unread'))

    expect(result.current.unreadOnly).toBe(true)
    expect(result.current.filtered).toHaveLength(2)
    expect(result.current.filtered.map((n) => n.id)).toEqual(['1', '3'])
  })

  it('restores the loaded list when the unread filter is cleared', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    act(() => result.current.handleTabChange('unread'))
    expect(result.current.filtered).toHaveLength(2)

    act(() => result.current.handleTabChange('all'))
    expect(result.current.filtered).toHaveLength(4)
    expect(result.current.unreadOnly).toBe(false)
  })

  it('shows only the selected type until that filter is toggled off', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    act(() => result.current.handleTypeFilter('InquirySubmitted'))
    expect(result.current.activeType).toBe('InquirySubmitted')
    expect(result.current.filtered).toHaveLength(2)
    expect(result.current.filtered.map((n) => n.id)).toEqual(['3', '4'])

    act(() => result.current.handleTypeFilter('InquirySubmitted'))
    expect(result.current.activeType).toBeNull()
    expect(result.current.filtered).toHaveLength(4)
  })

  it('counts unread entries in the loaded list independently of filters', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    expect(result.current.unreadCount).toBe(2)

    act(() => result.current.handleTypeFilter('TaskAssigned'))
    expect(result.current.unreadCount).toBe(2)
  })

  it('combines unread and type filters', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    act(() => {
      result.current.handleTabChange('unread')
    })
    act(() => {
      result.current.handleTypeFilter('TaskAssigned')
    })

    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe('1')
  })
})
