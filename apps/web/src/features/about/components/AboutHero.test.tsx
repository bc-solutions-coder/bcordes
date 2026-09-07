import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { AboutHero } from './AboutHero'

describe('AboutHero', () => {
  beforeEach(() => {
    controlMotion(true)
    controlIntersections()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows Bryan Cordes as the page heading', () => {
    render(<AboutHero />)
    expect(
      screen.getByRole('heading', { name: 'Bryan Cordes', level: 1 }),
    ).toBeTruthy()
  })

  it('renders the role title', () => {
    render(<AboutHero />)
    expect(screen.getByText('Full-Stack Software Engineer')).toBeTruthy()
  })

  it('renders the "About Me" badge', () => {
    render(<AboutHero />)
    expect(screen.getByText('About Me')).toBeTruthy()
  })

  it('introduces Bryan as a passionate software engineer', () => {
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
