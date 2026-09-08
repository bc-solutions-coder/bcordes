import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useNotificationSelection } from './useNotificationSelection'
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
  makeNotification({ id: 'a' }),
  makeNotification({ id: 'b' }),
  makeNotification({ id: 'c' }),
]

describe('useNotificationSelection', () => {
  it('starts with no notifications selected', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))
    expect(result.current.allSelected).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('selects every notification in the filtered list', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectAll(true))

    expect(result.current.selectedIds.size).toBe(3)
    expect(result.current.selectedIds.has('a')).toBe(true)
    expect(result.current.selectedIds.has('b')).toBe(true)
    expect(result.current.selectedIds.has('c')).toBe(true)
    expect(result.current.allSelected).toBe(true)
  })

  it('deselects every notification when select-all is cleared', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectAll(true))
    expect(result.current.selectedIds.size).toBe(3)

    act(() => result.current.selectAll(false))
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.allSelected).toBe(false)
  })

  it('selects and deselects one notification', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectOne('b', true))
    expect(result.current.selectedIds.has('b')).toBe(true)
    expect(result.current.selectedIds.size).toBe(1)

    act(() => result.current.selectOne('b', false))
    expect(result.current.selectedIds.has('b')).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('clears all selected notifications', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectAll(true))
    expect(result.current.selectedIds.size).toBe(3)

    act(() => result.current.clearSelection())
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('reports all selected only after every visible notification is selected', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectOne('a', true))
    act(() => result.current.selectOne('b', true))
    expect(result.current.allSelected).toBe(false)

    act(() => result.current.selectOne('c', true))
    expect(result.current.allSelected).toBe(true)
  })

  it('does not report all selected for an empty list', () => {
    const { result } = renderHook(() => useNotificationSelection([]))
    expect(result.current.allSelected).toBe(false)
  })
})
