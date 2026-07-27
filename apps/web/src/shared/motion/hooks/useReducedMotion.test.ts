import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

type ChangeListener = (event: MediaQueryListEvent) => void

function createMatchMediaStub(initialMatches: boolean) {
  let listener: ChangeListener | null = null
  const mql = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      listener = cb
    }),
    removeEventListener: vi.fn((_event: string, _cb: ChangeListener) => {
      listener = null
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  return {
    mql,
    trigger(matches: boolean) {
      if (listener) listener({ matches } as MediaQueryListEvent)
    },
    stub: vi.fn().mockReturnValue(mql),
  }
}

describe('useReducedMotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when prefers-reduced-motion is not set', async () => {
    const { stub } = createMatchMediaStub(false)
    vi.stubGlobal('matchMedia', stub)

    const { useReducedMotion } = await import('./useReducedMotion')
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current).toBe(false)
    expect(stub).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('returns true when prefers-reduced-motion is set', async () => {
    const { stub } = createMatchMediaStub(true)
    vi.stubGlobal('matchMedia', stub)

    const { useReducedMotion } = await import('./useReducedMotion')
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current).toBe(true)
  })

  it('responds to change events', async () => {
    const { stub, trigger } = createMatchMediaStub(false)
    vi.stubGlobal('matchMedia', stub)

    const { useReducedMotion } = await import('./useReducedMotion')
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current).toBe(false)

    act(() => {
      trigger(true)
    })

    expect(result.current).toBe(true)

    act(() => {
      trigger(false)
    })

    expect(result.current).toBe(false)
  })

  it('cleans up event listener on unmount', async () => {
    const { stub, mql } = createMatchMediaStub(false)
    vi.stubGlobal('matchMedia', stub)

    const { useReducedMotion } = await import('./useReducedMotion')
    const { unmount } = renderHook(() => useReducedMotion())

    unmount()

    expect(mql.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })
})
