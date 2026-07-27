import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

type IntersectionCallback = (
  entries: Array<Partial<IntersectionObserverEntry>>,
) => void

let observerCallback: IntersectionCallback
let observerOptions: IntersectionObserverInit | undefined

const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

class MockIntersectionObserver {
  constructor(
    callback: IntersectionCallback,
    options?: IntersectionObserverInit,
  ) {
    observerCallback = callback
    observerOptions = options
  }
  observe = mockObserve
  unobserve = mockUnobserve
  disconnect = mockDisconnect
  root = null
  rootMargin = ''
  thresholds = []
  takeRecords = vi.fn().mockReturnValue([])
}

describe('useScrollAnimation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('isVisible starts as false', async () => {
    const { useScrollAnimation } = await import('./useScrollAnimation')
    const { result } = renderHook(() => useScrollAnimation<HTMLDivElement>())

    expect(result.current.isVisible).toBe(false)
  })

  it('becomes true on intersection', async () => {
    const { useScrollAnimation } = await import('./useScrollAnimation')

    const div = document.createElement('div')

    const { result } = renderHook(() => {
      const hookResult = useScrollAnimation<HTMLDivElement>()
      ;(
        hookResult.ref as React.MutableRefObject<HTMLDivElement | null>
      ).current = div
      return hookResult
    })

    expect(result.current.isVisible).toBe(false)

    act(() => {
      observerCallback([{ isIntersecting: true }])
    })

    expect(result.current.isVisible).toBe(true)
  })

  it('passes options to IntersectionObserver', async () => {
    const { useScrollAnimation } = await import('./useScrollAnimation')

    const div = document.createElement('div')

    renderHook(() => {
      const hookResult = useScrollAnimation<HTMLDivElement>({
        threshold: 0.5,
        rootMargin: '10px',
      })
      ;(
        hookResult.ref as React.MutableRefObject<HTMLDivElement | null>
      ).current = div
      return hookResult
    })

    // The observer is created when the effect runs with a ref element
    // Options are captured by our mock
    expect(observerOptions).toEqual(
      expect.objectContaining({
        threshold: 0.5,
        rootMargin: '10px',
      }),
    )
  })

  it('unobserves element after intersection when triggerOnce is true (default)', async () => {
    const { useScrollAnimation } = await import('./useScrollAnimation')

    const div = document.createElement('div')

    const { result } = renderHook(() => {
      const hookResult = useScrollAnimation<HTMLDivElement>({
        triggerOnce: true,
      })
      ;(
        hookResult.ref as React.MutableRefObject<HTMLDivElement | null>
      ).current = div
      return hookResult
    })

    act(() => {
      observerCallback([{ isIntersecting: true }])
    })

    expect(result.current.isVisible).toBe(true)
    expect(mockUnobserve).toHaveBeenCalled()
  })

  it('toggles visibility when triggerOnce is false', async () => {
    const { useScrollAnimation } = await import('./useScrollAnimation')

    const div = document.createElement('div')

    const { result } = renderHook(() => {
      const hookResult = useScrollAnimation<HTMLDivElement>({
        triggerOnce: false,
      })
      ;(
        hookResult.ref as React.MutableRefObject<HTMLDivElement | null>
      ).current = div
      return hookResult
    })

    act(() => {
      observerCallback([{ isIntersecting: true }])
    })

    expect(result.current.isVisible).toBe(true)

    act(() => {
      observerCallback([{ isIntersecting: false }])
    })

    expect(result.current.isVisible).toBe(false)
  })

  it('cleans up observer on unmount', async () => {
    const { useScrollAnimation } = await import('./useScrollAnimation')

    const div = document.createElement('div')

    const { unmount } = renderHook(() => {
      const hookResult = useScrollAnimation<HTMLDivElement>()
      ;(
        hookResult.ref as React.MutableRefObject<HTMLDivElement | null>
      ).current = div
      return hookResult
    })

    unmount()

    expect(mockUnobserve).toHaveBeenCalled()
  })
})
