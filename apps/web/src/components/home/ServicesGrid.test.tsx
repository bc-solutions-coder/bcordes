import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { ServicesGrid } from './ServicesGrid'

vi.mock('@/hooks/useScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: createRef(),
    isVisible: true,
  })),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}))

describe('ServicesGrid', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the section heading', () => {
    render(<ServicesGrid />)
    expect(screen.getByText('What I Do')).toBeTruthy()
  })

  it('renders the section description', () => {
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

  it('renders skill tags for each service', () => {
    render(<ServicesGrid />)
    expect(screen.getByText('React')).toBeTruthy()
    expect(screen.getByText('TypeScript')).toBeTruthy()
    expect(screen.getByText('Node.js')).toBeTruthy()
    expect(screen.getByText('PostgreSQL')).toBeTruthy()
    expect(screen.getByText('Architecture')).toBeTruthy()
    expect(screen.getByText('Code Review')).toBeTruthy()
  })
})
