import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { AboutHero } from './AboutHero'

vi.mock('@/hooks/useScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: createRef(),
    isVisible: true,
  })),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}))

describe('AboutHero', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the heading with name', () => {
    render(<AboutHero />)
    expect(screen.getByText('Bryan Cordes')).toBeTruthy()
  })

  it('renders the role title', () => {
    render(<AboutHero />)
    expect(screen.getByText('Full-Stack Software Engineer')).toBeTruthy()
  })

  it('renders the "About Me" badge', () => {
    render(<AboutHero />)
    expect(screen.getByText('About Me')).toBeTruthy()
  })

  it('renders the description text', () => {
    render(<AboutHero />)
    expect(screen.getByText(/passionate software engineer/i)).toBeTruthy()
  })

  it('renders the profile image with alt text', () => {
    render(<AboutHero />)
    const img = screen.getByAltText('Bryan Cordes')
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/profile-picture.png')
  })

  it('renders "Available for Remote Work" text', () => {
    render(<AboutHero />)
    expect(screen.getByText('Available for Remote Work')).toBeTruthy()
  })
})
