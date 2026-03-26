import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

type ChangeListener = (event: { matches: boolean }) => void

function createMatchMediaStub(initialMatches: boolean) {
  let listener: ChangeListener | null = null
  const mql = {
    matches: initialMatches,
    media: '',
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
      if (listener) listener({ matches })
    },
    stub: vi.fn().mockReturnValue(mql),
  }
}

describe('useIsMobile', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    vi.clearAllMocks()
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  it('returns true when window width < 768', async () => {
    const { stub } = createMatchMediaStub(true)
    vi.stubGlobal('matchMedia', stub)
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('./use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('returns false when window width >= 768', async () => {
    const { stub } = createMatchMediaStub(false)
    vi.stubGlobal('matchMedia', stub)
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('./use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('responds to change events', async () => {
    const { stub, trigger } = createMatchMediaStub(false)
    vi.stubGlobal('matchMedia', stub)
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('./use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
        configurable: true,
      })
      trigger(true)
    })

    expect(result.current).toBe(true)
  })

  it('cleans up event listener on unmount', async () => {
    const { stub, mql } = createMatchMediaStub(false)
    vi.stubGlobal('matchMedia', stub)
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('./use-mobile')
    const { unmount } = renderHook(() => useIsMobile())

    unmount()

    expect(mql.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })
})
