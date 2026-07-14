import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { FadeInView } from './FadeInView'

import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { useReducedMotion } from '@/hooks/useReducedMotion'

vi.mock('@/hooks/useScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: createRef(),
    isVisible: false,
  })),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

const mockedUseScrollAnimation = vi.mocked(useScrollAnimation)
const mockedUseReducedMotion = vi.mocked(useReducedMotion)

describe('FadeInView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseScrollAnimation.mockReturnValue({
      ref: createRef() as React.RefObject<HTMLDivElement>,
      isVisible: false,
    })
    mockedUseReducedMotion.mockReturnValue(false)
  })

  it('renders children', () => {
    render(
      <FadeInView>
        <p>Hello</p>
      </FadeInView>,
    )
    expect(screen.getByText('Hello')).toBeTruthy()
  })

  it('applies hidden classes when isVisible is false and motion not reduced', () => {
    mockedUseScrollAnimation.mockReturnValue({
      ref: createRef() as React.RefObject<HTMLDivElement>,
      isVisible: false,
    })
    mockedUseReducedMotion.mockReturnValue(false)

    const { container } = render(
      <FadeInView>
        <p>Content</p>
      </FadeInView>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('opacity-0')
    expect(wrapper.className).toContain('translate-y-8')
  })

  it('applies visible classes when isVisible is true', () => {
    mockedUseScrollAnimation.mockReturnValue({
      ref: createRef() as React.RefObject<HTMLDivElement>,
      isVisible: true,
    })
    mockedUseReducedMotion.mockReturnValue(false)

    const { container } = render(
      <FadeInView>
        <p>Content</p>
      </FadeInView>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('opacity-100')
    expect(wrapper.className).toContain('translate-y-0')
    expect(wrapper.className).not.toContain('opacity-0')
  })

  it('shows children visible regardless when reducedMotion is true', () => {
    mockedUseScrollAnimation.mockReturnValue({
      ref: createRef() as React.RefObject<HTMLDivElement>,
      isVisible: false,
    })
    mockedUseReducedMotion.mockReturnValue(true)

    const { container } = render(
      <FadeInView>
        <p>Content</p>
      </FadeInView>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('opacity-100')
    expect(wrapper.className).toContain('translate-y-0')
    expect(wrapper.className).not.toContain('opacity-0')
  })

  it('sets transitionDelay to 0ms when reducedMotion is true', () => {
    mockedUseReducedMotion.mockReturnValue(true)

    const { container } = render(
      <FadeInView delay={200}>
        <p>Content</p>
      </FadeInView>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.transitionDelay).toBe('0ms')
  })

  it('reflects delay prop in transitionDelay style', () => {
    mockedUseReducedMotion.mockReturnValue(false)

    const { container } = render(
      <FadeInView delay={300}>
        <p>Content</p>
      </FadeInView>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.transitionDelay).toBe('300ms')
  })

  it('applies custom className', () => {
    const { container } = render(
      <FadeInView className="my-custom-class">
        <p>Content</p>
      </FadeInView>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('my-custom-class')
  })

  it('passes threshold to useScrollAnimation', () => {
    render(
      <FadeInView threshold={0.5}>
        <p>Content</p>
      </FadeInView>,
    )
    expect(mockedUseScrollAnimation).toHaveBeenCalledWith({ threshold: 0.5 })
  })
})
