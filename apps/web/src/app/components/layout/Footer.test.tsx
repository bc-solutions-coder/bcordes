import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderRoute } from '../../../../testing/render-route'
import { Footer } from './Footer'

beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Footer', () => {
  it('renders copyright text with current year', async () => {
    await renderRoute(<Footer />)
    const year = new Date().getFullYear()
    expect(
      screen.getByText(new RegExp(`${year} BC Solutions`)),
    ).toBeInTheDocument()
  })

  it('links Home, Projects, About, and Resume to their public pages', async () => {
    await renderRoute(<Footer />)
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    )
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about',
    )
    expect(screen.getByRole('link', { name: 'Resume' })).toHaveAttribute(
      'href',
      '/resume',
    )
  })

  it('offers named GitHub, LinkedIn, and email links to the correct destinations', async () => {
    await renderRoute(<Footer />)
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/BC-Solutions-Coder',
    )
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/bryancordes',
    )
    for (const name of ['GitHub', 'LinkedIn']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'target',
        '_blank',
      )
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'rel',
        'noopener noreferrer',
      )
    }
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:BC@bcordes.dev',
    )
  })
})
