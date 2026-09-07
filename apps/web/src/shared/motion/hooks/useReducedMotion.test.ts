import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { controlMotion } from '../../../../testing/motion'
import { useReducedMotion } from './useReducedMotion'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useReducedMotion', () => {
  it('returns false when prefers-reduced-motion is not set', () => {
    const motion = controlMotion()
    const { result } = renderHook(useReducedMotion)
    expect(result.current).toBe(false)
    expect(motion.matchMedia).toHaveBeenCalledWith(
      '(prefers-reduced-motion: reduce)',
    )
  })
  it('returns true when prefers-reduced-motion is set', () => {
    controlMotion(true)
    const { result } = renderHook(useReducedMotion)
    expect(result.current).toBe(true)
  })
  it('updates the preference when reduced motion is enabled and disabled', () => {
    const motion = controlMotion()
    const { result } = renderHook(useReducedMotion)
    expect(result.current).toBe(false)
    act(() => motion.change(true))
    expect(result.current).toBe(true)
    act(() => motion.change(false))
    expect(result.current).toBe(false)
  })
  it('stops listening after unmount while another subscriber continues receiving changes', () => {
    const motion = controlMotion()
    const first = renderHook(useReducedMotion)
    const second = renderHook(useReducedMotion)
    expect(motion.listeners.size).toBe(2)
    first.unmount()
    expect(motion.listeners.size).toBe(1)
    act(() => motion.change(true))
    expect(second.result.current).toBe(true)
    second.unmount()
    expect(motion.listeners.size).toBe(0)
  })
})
