import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderProjectRoute } from '../../../testing/render-project-route'
import { controlIntersections, controlMotion } from '../../../testing/motion'

beforeEach(() => {
  controlMotion(true)
  controlIntersections()
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Projects page', () => {
  it('provides Projects title, description and canonical Open Graph URL', async () => {
    await renderProjectRoute()
    expect(document.title).toBe('Projects | BC Solutions')
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
    ]) {
      expect(document.querySelector(selector)).toHaveAttribute(
        'content',
        'Showcasing projects and work across different industries and technologies.',
      )
    }
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Projects | BC Solutions',
    )
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://bcordes.dev/projects',
    )
  })
  it('loads published projects into the projects page', async () => {
    await renderProjectRoute()
    expect(screen.getByRole('link', { name: /Bcordes/ })).toHaveAttribute(
      'href',
      '/projects/bcordes',
    )
    expect(screen.getByRole('link', { name: /Wallow/ })).toHaveAttribute(
      'href',
      '/projects/wallow',
    )
  })
  it('shows an empty project list when the catalog returns no projects', async () => {
    const projects = await import('@/features/projects')
    vi.spyOn(projects, 'getShowcases').mockReturnValue([])
    await renderProjectRoute()
    expect(screen.getByText('Showing 0 of 0 projects')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'No projects found' }),
    ).toBeInTheDocument()
  })
})
