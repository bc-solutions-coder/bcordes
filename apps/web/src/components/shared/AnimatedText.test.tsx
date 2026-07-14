import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnimatedText } from './AnimatedText'

import { useReducedMotion } from '@/hooks/useReducedMotion'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

const mockedUseReducedMotion = vi.mocked(useReducedMotion)

describe('AnimatedText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseReducedMotion.mockReturnValue(false)
  })

  it('renders text content', () => {
    render(<AnimatedText text="Hello World" />)
    expect(screen.getByText(/Hello/)).toBeTruthy()
    expect(screen.getByText(/World/)).toBeTruthy()
  })

  it('renders plain text in specified element when reducedMotion is true', () => {
    mockedUseReducedMotion.mockReturnValue(true)

    render(<AnimatedText text="Hello World" as="h1" />)
    const heading = screen.getByText('Hello World')
    expect(heading.tagName).toBe('H1')
  })

  it('renders as span by default when reducedMotion is true', () => {
    mockedUseReducedMotion.mockReturnValue(true)

    const { container } = render(<AnimatedText text="Greetings" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.tagName).toBe('SPAN')
    expect(el.textContent).toBe('Greetings')
  })

  it('splits words into individual spans when motion is not reduced', () => {
    const { container } = render(<AnimatedText text="One Two Three" />)
    const wordSpans = container.querySelectorAll('span.animate-fade-in-up')
    expect(wordSpans).toHaveLength(3)
  })

  it('applies stagger delay to each word', () => {
    const { container } = render(
      <AnimatedText text="A B C" staggerDelay={50} />,
    )
    const wordSpans = container.querySelectorAll('span.animate-fade-in-up')
    expect((wordSpans[0] as HTMLElement).style.animationDelay).toBe('0ms')
    expect((wordSpans[1] as HTMLElement).style.animationDelay).toBe('50ms')
    expect((wordSpans[2] as HTMLElement).style.animationDelay).toBe('100ms')
  })

  it('uses default staggerDelay of 30ms', () => {
    const { container } = render(<AnimatedText text="A B" />)
    const wordSpans = container.querySelectorAll('span.animate-fade-in-up')
    expect((wordSpans[1] as HTMLElement).style.animationDelay).toBe('30ms')
  })

  it('applies custom className when reducedMotion is true', () => {
    mockedUseReducedMotion.mockReturnValue(true)

    const { container } = render(
      <AnimatedText text="Styled" className="text-lg" />,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('text-lg')
    expect(el.textContent).toBe('Styled')
  })

  it('renders as different HTML elements via as prop', () => {
    mockedUseReducedMotion.mockReturnValue(true)

    const { unmount } = render(<AnimatedText text="Test" as="h2" />)
    expect(screen.getByText('Test').tagName).toBe('H2')
    unmount()

    render(<AnimatedText text="Test" as="p" />)
    expect(screen.getByText('Test').tagName).toBe('P')
  })

  it('applies animationFillMode forwards to word spans', () => {
    const { container } = render(<AnimatedText text="Hello World" />)
    const wordSpans = container.querySelectorAll('span.animate-fade-in-up')
    expect((wordSpans[0] as HTMLElement).style.animationFillMode).toBe(
      'forwards',
    )
  })

  it('adds non-breaking space between words but not after last', () => {
    const { container } = render(<AnimatedText text="A B C" />)
    const wordSpans = container.querySelectorAll('span.animate-fade-in-up')
    expect(wordSpans[0].textContent).toBe('A\u00A0')
    expect(wordSpans[1].textContent).toBe('B\u00A0')
    expect(wordSpans[2].textContent).toBe('C')
  })
})
