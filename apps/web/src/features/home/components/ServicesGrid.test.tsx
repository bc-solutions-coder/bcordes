import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { ServicesGrid } from './ServicesGrid'

describe('ServicesGrid', () => {
  beforeEach(() => {
    controlMotion(true)
    controlIntersections()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows What I Do as a section heading', () => {
    render(<ServicesGrid />)
    expect(
      screen.getByRole('heading', { name: 'What I Do', level: 2 }),
    ).toBeTruthy()
  })

  it('introduces comprehensive software services', () => {
    render(<ServicesGrid />)
    expect(screen.getByText(/comprehensive software solutions/i)).toBeTruthy()
  })

  it('renders all three service card titles', () => {
    render(<ServicesGrid />)
    expect(screen.getByText('Frontend Development')).toBeTruthy()
    expect(screen.getByText('Full-Stack Solutions')).toBeTruthy()
    expect(screen.getByText('Technical Consulting')).toBeTruthy()
  })

  it('renders service descriptions', () => {
    render(<ServicesGrid />)
    expect(
      screen.getByText(/Modern, responsive web applications/i),
    ).toBeTruthy()
    expect(
      screen.getByText(/End-to-end development from database/i),
    ).toBeTruthy()
    expect(screen.getByText(/Strategic guidance on architecture/i)).toBeTruthy()
  })

  it('shows representative frontend, backend, and consulting skills', () => {
    render(<ServicesGrid />)
    expect(screen.getByText('React')).toBeTruthy()
    expect(screen.getByText('TypeScript')).toBeTruthy()
    expect(screen.getByText('Node.js')).toBeTruthy()
    expect(screen.getByText('PostgreSQL')).toBeTruthy()
    expect(screen.getByText('Architecture')).toBeTruthy()
    expect(screen.getByText('Code Review')).toBeTruthy()
  })
})
