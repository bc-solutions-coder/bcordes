import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { Notification } from '@/lib/wallow/types'
import { useNotificationSelection } from '@/hooks/useNotificationSelection'

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
  makeNotification({ id: 'a' }),
  makeNotification({ id: 'b' }),
  makeNotification({ id: 'c' }),
]

describe('useNotificationSelection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allSelected is false initially', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))
    expect(result.current.allSelected).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('selectAll(true) adds all filtered IDs', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectAll(true))

    expect(result.current.selectedIds.size).toBe(3)
    expect(result.current.selectedIds.has('a')).toBe(true)
    expect(result.current.selectedIds.has('b')).toBe(true)
    expect(result.current.selectedIds.has('c')).toBe(true)
    expect(result.current.allSelected).toBe(true)
  })

  it('selectAll(false) clears selection', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectAll(true))
    expect(result.current.selectedIds.size).toBe(3)

    act(() => result.current.selectAll(false))
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.allSelected).toBe(false)
  })

  it('selectOne adds and removes a single ID', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectOne('b', true))
    expect(result.current.selectedIds.has('b')).toBe(true)
    expect(result.current.selectedIds.size).toBe(1)

    act(() => result.current.selectOne('b', false))
    expect(result.current.selectedIds.has('b')).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('clearSelection empties the set', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    act(() => result.current.selectAll(true))
    expect(result.current.selectedIds.size).toBe(3)

    act(() => result.current.clearSelection())
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('allSelected is true only when all filtered items are selected', () => {
    const { result } = renderHook(() => useNotificationSelection(fixtures))

    // Select 2 of 3 — not all
    act(() => result.current.selectOne('a', true))
    act(() => result.current.selectOne('b', true))
    expect(result.current.allSelected).toBe(false)

    // Select the last one
    act(() => result.current.selectOne('c', true))
    expect(result.current.allSelected).toBe(true)
  })

  it('allSelected is false when filtered list is empty', () => {
    const { result } = renderHook(() => useNotificationSelection([]))
    expect(result.current.allSelected).toBe(false)
  })
})
