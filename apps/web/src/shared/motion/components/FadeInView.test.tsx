import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { FadeInView } from './FadeInView'

let intersections: ReturnType<typeof controlIntersections>
beforeEach(() => {
  intersections = controlIntersections()
  controlMotion()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('renders children without a requested delay', () => {
  render(
    <FadeInView>
      <p>Hello</p>
    </FadeInView>,
  )
  const child = screen.getByText('Hello')
  expect(child).toBeInTheDocument()
  expect(child.parentElement).toHaveStyle({ transitionDelay: '0ms' })
})

it('preserves the requested delay when the observed content enters the reveal region', () => {
  render(
    <FadeInView delay={300}>
      <p>Delayed content</p>
    </FadeInView>,
  )
  const container = screen.getByText('Delayed content').parentElement
  if (!container) throw new Error('Reveal container missing')
  expect(container).toHaveStyle({ transitionDelay: '300ms' })
  act(() => intersections.intersect(container, true))
  expect(intersections.isObserved(container)).toBe(false)
  expect(container).toHaveStyle({ transitionDelay: '300ms' })
})

it('removes the requested delay when the browser preference changes to reduced motion', () => {
  const motion = controlMotion()
  render(
    <FadeInView delay={200}>
      <p>Motion preference content</p>
    </FadeInView>,
  )
  const container = screen.getByText('Motion preference content').parentElement
  expect(container).toHaveStyle({ transitionDelay: '200ms' })
  act(() => motion.change(true))
  expect(container).toHaveStyle({ transitionDelay: '0ms' })
  act(() => motion.change(false))
  expect(container).toHaveStyle({ transitionDelay: '200ms' })
})
