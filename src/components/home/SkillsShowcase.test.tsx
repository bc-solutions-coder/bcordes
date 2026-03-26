import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { SkillsShowcase } from './SkillsShowcase'

vi.mock('@/hooks/useScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: createRef(),
    isVisible: true,
  })),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}))

describe('SkillsShowcase', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the section heading', () => {
    render(<SkillsShowcase />)
    expect(screen.getByText('Technologies & Skills')).toBeTruthy()
  })

  it('renders the section description', () => {
    render(<SkillsShowcase />)
    expect(
      screen.getByText(/comprehensive toolkit built over years/i),
    ).toBeTruthy()
  })

  it('renders all four category headings', () => {
    render(<SkillsShowcase />)
    expect(screen.getByText('Frontend')).toBeTruthy()
    expect(screen.getByText('Backend')).toBeTruthy()
    expect(screen.getByText('Tools')).toBeTruthy()
    expect(screen.getByText('Cloud')).toBeTruthy()
  })

  it('renders frontend skills', () => {
    render(<SkillsShowcase />)
    expect(screen.getByText('React')).toBeTruthy()
    expect(screen.getByText('TypeScript')).toBeTruthy()
    expect(screen.getByText('Next.js')).toBeTruthy()
    expect(screen.getByText('TailwindCSS')).toBeTruthy()
    expect(screen.getByText('Vue.js')).toBeTruthy()
    expect(screen.getByText('HTML/CSS')).toBeTruthy()
  })

  it('renders backend skills', () => {
    render(<SkillsShowcase />)
    expect(screen.getByText('Node.js')).toBeTruthy()
    expect(screen.getByText('Python')).toBeTruthy()
    expect(screen.getByText('Java')).toBeTruthy()
    expect(screen.getByText('PostgreSQL')).toBeTruthy()
    expect(screen.getByText('MongoDB')).toBeTruthy()
    expect(screen.getByText('Redis')).toBeTruthy()
  })

  it('renders tools skills', () => {
    render(<SkillsShowcase />)
    expect(screen.getByText('Git')).toBeTruthy()
    expect(screen.getByText('Docker')).toBeTruthy()
    expect(screen.getByText('Kubernetes')).toBeTruthy()
    expect(screen.getByText('Webpack')).toBeTruthy()
    expect(screen.getByText('Vite')).toBeTruthy()
    expect(screen.getByText('Jest')).toBeTruthy()
  })

  it('renders cloud skills', () => {
    render(<SkillsShowcase />)
    expect(screen.getByText('AWS')).toBeTruthy()
    expect(screen.getByText('GCP')).toBeTruthy()
    expect(screen.getByText('Vercel')).toBeTruthy()
    expect(screen.getByText('Cloudflare')).toBeTruthy()
    expect(screen.getByText('CI/CD')).toBeTruthy()
    expect(screen.getByText('Terraform')).toBeTruthy()
  })
})
