import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { Hero } from './Hero'

vi.mock('@/hooks/useScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: createRef(),
    isVisible: true,
  })),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

describe('Hero', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the headline text', () => {
    render(<Hero />)
    expect(screen.getByText(/Professional/)).toBeTruthy()
    expect(screen.getByText(/Engineering/)).toBeTruthy()
  })

  it('renders the description paragraph', () => {
    render(<Hero />)
    expect(screen.getByText(/BC Solutions delivers high-quality/i)).toBeTruthy()
  })

  it('renders "Available for Projects" status badge', () => {
    render(<Hero />)
    expect(screen.getByText('Available for Projects')).toBeTruthy()
  })

  it('renders CTA buttons with correct links', () => {
    render(<Hero />)
    const projectsLink = screen.getByText('View My Projects')
    expect(projectsLink.closest('a')?.getAttribute('href')).toBe('/projects')

    const contactLink = screen.getByText('Get in Touch')
    expect(contactLink.closest('a')?.getAttribute('href')).toBe('/contact')
  })

  it('renders statistics', () => {
    render(<Hero />)
    expect(screen.getByText('6+')).toBeTruthy()
    expect(screen.getByText('Years Experience')).toBeTruthy()
    expect(screen.getByText('25+')).toBeTruthy()
    expect(screen.getByText('Projects Delivered')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()
    expect(screen.getByText('Client Satisfaction')).toBeTruthy()
  })

  it('has an aria-label on the intro section', () => {
    render(<Hero />)
    expect(screen.getByLabelText('Introduction')).toBeTruthy()
  })

  it('has a key statistics list with correct role', () => {
    render(<Hero />)
    expect(screen.getByRole('list', { name: 'Key statistics' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })
})
