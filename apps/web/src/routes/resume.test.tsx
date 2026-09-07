import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderFileRoute } from '../../testing/render-file-route'
import { controlIntersections, controlMotion } from '../../testing/motion'
import { Route } from './resume'

beforeEach(() => {
  controlMotion(true)
  controlIntersections()
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Resume page', () => {
  describe('Page content', () => {
    it('renders Resume as the page heading', async () => {
      await renderFileRoute(Route, '/resume')
      expect(
        screen.getByRole('heading', { name: 'Resume', level: 1 }),
      ).toBeTruthy()
    })

    it('states seven-plus years of professional engineering experience', async () => {
      await renderFileRoute(Route, '/resume')
      expect(
        screen.getByText(
          '7+ years of professional software engineering experience',
        ),
      ).toBeTruthy()
    })

    it('offers the resume PDF as a download', async () => {
      await renderFileRoute(Route, '/resume')
      const downloadLink = screen.getByRole('link', { name: 'Download PDF' })
      expect(downloadLink).toHaveAttribute('download')
      expect(downloadLink.closest('a')?.getAttribute('href')).toBe(
        '/Cordes-Resume.pdf',
      )
    })

    it('lists the current employers and engineering roles', async () => {
      await renderFileRoute(Route, '/resume')
      expect(screen.getByText('Experience')).toBeTruthy()
      expect(
        screen.getAllByText(
          'Software Engineer (Contract via Sketch Development)',
        ),
      ).toHaveLength(2)
      expect(screen.getByText('Intterra')).toBeTruthy()
      expect(screen.getByText('Drop Collaborative')).toBeTruthy()
      expect(screen.getByText('Valiantys')).toBeTruthy()
      expect(screen.getByText('Hyperion, LLC')).toBeTruthy()
      expect(screen.getByText('Quality Assurance Intern')).toBeTruthy()
      expect(screen.getByText('Flightdocs Inc')).toBeTruthy()
    })

    it('renders Skills section with categories', async () => {
      await renderFileRoute(Route, '/resume')
      expect(screen.getByText('Skills')).toBeTruthy()
      expect(screen.getByText('Frontend')).toBeTruthy()
      expect(screen.getByText('Backend')).toBeTruthy()
      expect(screen.getByText('Cloud & Infrastructure')).toBeTruthy()
      expect(screen.getByText('Tools & Platforms')).toBeTruthy()
      expect(screen.getByText('Databases')).toBeTruthy()
    })

    it('lists TypeScript, React, Node.js, and Docker skills', async () => {
      await renderFileRoute(Route, '/resume')
      expect(screen.getByText('TypeScript')).toBeTruthy()
      expect(screen.getByText('React')).toBeTruthy()
      expect(screen.getByText('Node.js')).toBeTruthy()
      expect(screen.getByText('Docker')).toBeTruthy()
    })

    it('renders Education section', async () => {
      await renderFileRoute(Route, '/resume')
      expect(screen.getByText('Education')).toBeTruthy()
      expect(
        screen.getByText('Bachelor of Science, Software Engineering'),
      ).toBeTruthy()
      expect(
        screen.getByText('Florida Gulf Coast University, Fort Myers, FL'),
      ).toBeTruthy()
    })
  })
})
