import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, screen } from '@testing-library/react'
import { Footer } from './Footer'
import { renderWithProviders } from '@/test/helpers/render'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
    [key: string]: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

afterEach(() => {
  cleanup()
})

describe('Footer', () => {
  it('renders copyright text with current year', () => {
    renderWithProviders(<Footer />)
    const year = new Date().getFullYear()
    expect(
      screen.getByText(new RegExp(`${year} BC Solutions`)),
    ).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Resume' })).toBeInTheDocument()
  })

  it('renders social links with correct aria labels', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument()
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('renders social links with correct hrefs', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByLabelText('GitHub')).toHaveAttribute(
      'href',
      'https://github.com/BC-Solutions-Coder',
    )
    expect(screen.getByLabelText('LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/bryancordes',
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'href',
      'mailto:BC@bcordes.dev',
    )
  })
})
