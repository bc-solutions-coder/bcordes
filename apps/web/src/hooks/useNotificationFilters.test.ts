import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { Notification } from '@/lib/wallow/types'
import { useNotificationFilters } from '@/hooks/useNotificationFilters'

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
  beforeEach(() => vi.clearAllMocks())

  it('returns the full array when no filters are active', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))
    expect(result.current.filtered).toEqual(fixtures)
    expect(result.current.unreadOnly).toBe(false)
    expect(result.current.activeType).toBeNull()
  })

  it('handleTabChange("unread") filters to unread only and resets page', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    // Advance page first to verify reset
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    act(() => result.current.handleTabChange('unread'))

    expect(result.current.unreadOnly).toBe(true)
    expect(result.current.page).toBe(1)
    expect(result.current.filtered).toHaveLength(2)
    expect(result.current.filtered.every((n) => !n.isRead)).toBe(true)
  })

  it('handleTabChange("all") removes unread filter', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    act(() => result.current.handleTabChange('unread'))
    expect(result.current.filtered).toHaveLength(2)

    act(() => result.current.handleTabChange('all'))
    expect(result.current.filtered).toHaveLength(4)
    expect(result.current.unreadOnly).toBe(false)
  })

  it('handleTypeFilter filters by type and toggles off on second call', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    act(() => result.current.handleTypeFilter('InquirySubmitted'))
    expect(result.current.activeType).toBe('InquirySubmitted')
    expect(result.current.filtered).toHaveLength(2)
    expect(
      result.current.filtered.every((n) => n.type === 'InquirySubmitted'),
    ).toBe(true)
    expect(result.current.page).toBe(1)

    // Toggle off
    act(() => result.current.handleTypeFilter('InquirySubmitted'))
    expect(result.current.activeType).toBeNull()
    expect(result.current.filtered).toHaveLength(4)
  })

  it('unreadCount reflects only unread items regardless of filters', () => {
    const { result } = renderHook(() => useNotificationFilters(fixtures))

    // unreadCount should be 2 (id 1 and 3)
    expect(result.current.unreadCount).toBe(2)

    // Even after filtering by type, unreadCount is based on full list
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
