import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { SkillsShowcase } from './SkillsShowcase'

describe('SkillsShowcase', () => {
  beforeEach(() => {
    controlMotion(true)
    controlIntersections()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows Technologies & Skills as a section heading', () => {
    render(<SkillsShowcase />)
    expect(
      screen.getByRole('heading', { name: 'Technologies & Skills', level: 2 }),
    ).toBeTruthy()
  })

  it('introduces the professional technology toolkit', () => {
    render(<SkillsShowcase />)
    expect(
      screen.getByText(/comprehensive toolkit built over years/i),
    ).toBeTruthy()
  })

  it('shows Frontend, Backend, Tools, and Cloud as category headings', () => {
    render(<SkillsShowcase />)
    expect(
      screen.getByRole('heading', { name: 'Frontend', level: 3 }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Backend', level: 3 }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Tools', level: 3 }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Cloud', level: 3 }),
    ).toBeTruthy()
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
