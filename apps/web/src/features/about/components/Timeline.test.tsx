import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Timeline } from './Timeline'

vi.mock('@/shared/motion', () => ({
  FadeInView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('Timeline', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the section heading', () => {
    render(<Timeline />)
    expect(screen.getByText('Career Journey')).toBeTruthy()
  })

  it('renders the section description', () => {
    render(<Timeline />)
    expect(screen.getByText(/timeline of my professional growth/i)).toBeTruthy()
  })

  it('renders all timeline entry periods', () => {
    render(<Timeline />)
    expect(screen.getByText('Nov 2025 - Feb 2026')).toBeTruthy()
    expect(screen.getByText('July 2021 - Aug 2025')).toBeTruthy()
    expect(screen.getByText('July 2019 - July 2021')).toBeTruthy()
    expect(screen.getByText('Apr 2019 - June 2019')).toBeTruthy()
  })

  it('renders all role titles', () => {
    render(<Timeline />)
    expect(
      screen.getAllByText(
        'Software Engineer (Contract via Sketch Development)',
      ),
    ).toHaveLength(2)
    expect(screen.getAllByText('Software Engineer')).toHaveLength(2)
    expect(screen.getByText('Quality Assurance Intern')).toBeTruthy()
  })

  it('renders all company names', () => {
    render(<Timeline />)
    expect(screen.getByText('Intterra')).toBeTruthy()
    expect(screen.getByText('Drop Collaborative')).toBeTruthy()
    expect(screen.getByText('Valiantys')).toBeTruthy()
    expect(screen.getByText('Hyperion, LLC')).toBeTruthy()
    expect(screen.getByText('Flightdocs Inc')).toBeTruthy()
  })

  it('renders timeline entry descriptions', () => {
    render(<Timeline />)
    expect(screen.getByText(/enforcement management module/i)).toBeTruthy()
    expect(
      screen.getByText(/Nx monorepo, improving code organization/i),
    ).toBeTruthy()
  })
})
