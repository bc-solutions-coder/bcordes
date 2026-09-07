import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { controlIntersections, controlMotion } from '../../../../testing/motion'
import { Timeline } from './Timeline'

describe('Timeline', () => {
  beforeEach(() => {
    controlMotion(true)
    controlIntersections()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows Career Journey as a section heading', () => {
    render(<Timeline />)
    expect(
      screen.getByRole('heading', { name: 'Career Journey', level: 2 }),
    ).toBeTruthy()
  })

  it('introduces the career timeline as professional growth', () => {
    render(<Timeline />)
    expect(screen.getByText(/timeline of my professional growth/i)).toBeTruthy()
  })

  it('shows all five career periods from April 2026 through April 2019', () => {
    render(<Timeline />)
    for (const [company, period] of [
      ['Intterra', 'Apr 2026 - July 2026'],
      ['Drop Collaborative', 'Nov 2025 - Feb 2026'],
      ['Valiantys', 'July 2021 - Aug 2025'],
      ['Hyperion, LLC', 'July 2019 - July 2021'],
      ['Flightdocs Inc', 'Apr 2019 - June 2019'],
    ])
      expect(screen.getByText(company).parentElement).toHaveTextContent(period)
  })

  it('shows two contract roles, two engineer roles, and one QA internship', () => {
    render(<Timeline />)
    expect(
      screen.getAllByRole('heading', {
        name: 'Software Engineer (Contract via Sketch Development)',
        level: 3,
      }),
    ).toHaveLength(2)
    expect(
      screen.getAllByRole('heading', { name: 'Software Engineer', level: 3 }),
    ).toHaveLength(2)
    expect(
      screen.getByRole('heading', {
        name: 'Quality Assurance Intern',
        level: 3,
      }),
    ).toBeTruthy()
  })

  it('renders all company names', () => {
    render(<Timeline />)
    expect(screen.getByText('Intterra')).toBeTruthy()
    expect(screen.getByText('Drop Collaborative')).toBeTruthy()
    expect(screen.getByText('Valiantys')).toBeTruthy()
    expect(screen.getByText('Hyperion, LLC')).toBeTruthy()
    expect(screen.getByText('Flightdocs Inc')).toBeTruthy()
  })

  it('describes enforcement workflows and monorepo experience', () => {
    render(<Timeline />)
    expect(screen.getByText(/enforcement management module/i)).toBeTruthy()
    expect(
      screen.getByText(/Nx monorepo, improving code organization/i),
    ).toBeTruthy()
  })
})
