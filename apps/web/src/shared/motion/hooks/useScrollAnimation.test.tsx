import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import { controlIntersections } from '../../../../testing/motion'
import { useScrollAnimation } from './useScrollAnimation'

function Reveal({
  name = 'First',
  ...options
}: Parameters<typeof useScrollAnimation>[0] & { name?: string }) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>(options)
  return (
    <div ref={ref} aria-label={name} role="status">
      {isVisible ? 'Visible' : 'Hidden'}
    </div>
  )
}

let intersections: ReturnType<typeof controlIntersections>
beforeEach(() => {
  intersections = controlIntersections()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useScrollAnimation', () => {
  it('remains hidden when no element is attached', () => {
    const { result } = renderHook(() => useScrollAnimation())
    expect(result.current.isVisible).toBe(false)
  })
  it('reveals the attached element when it intersects', () => {
    render(<Reveal />)
    const target = screen.getByRole('status', { name: 'First' })
    expect(target).toHaveTextContent('Hidden')
    act(() => intersections.intersect(target, true))
    expect(target).toHaveTextContent('Visible')
  })
  it('configures the reveal region with the requested threshold and margin', () => {
    render(<Reveal threshold={0.5} rootMargin="10px" />)
    const target = screen.getByRole('status', { name: 'First' })
    const observer = [...intersections.observers].find((candidate) =>
      candidate.targets.has(target),
    )
    expect(observer?.options).toEqual({ threshold: 0.5, rootMargin: '10px' })
  })
  it('stays visible after its first intersection by default', () => {
    render(<Reveal />)
    const target = screen.getByRole('status', { name: 'First' })
    act(() => intersections.intersect(target, true))
    expect(target).toHaveTextContent('Visible')
    expect(intersections.isObserved(target)).toBe(false)
    act(() => intersections.intersect(target, false))
    expect(target).toHaveTextContent('Visible')
  })
  it('hides the element again after it leaves when repeated animation is enabled', () => {
    render(<Reveal triggerOnce={false} />)
    const target = screen.getByRole('status', { name: 'First' })
    for (const isIntersecting of [true, false, true]) {
      act(() => intersections.intersect(target, isIntersecting))
      expect(target).toHaveTextContent(isIntersecting ? 'Visible' : 'Hidden')
    }
  })
  it('stops observing its element after unmount while another observer remains active', () => {
    const first = render(<Reveal />)
    const second = render(<Reveal name="Second" />)
    const target = screen.getByRole('status', { name: 'First' })
    const sibling = screen.getByRole('status', { name: 'Second' })
    expect(intersections.isObserved(target)).toBe(true)
    first.unmount()
    expect(intersections.isObserved(target)).toBe(false)
    act(() => intersections.intersect(sibling, true))
    expect(sibling).toHaveTextContent('Visible')
    second.unmount()
  })
})
