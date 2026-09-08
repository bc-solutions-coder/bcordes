import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@bcordes/test-utils'
import { ProjectFilter } from './ProjectFilter'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

const defaultTags = ['React', 'TypeScript', 'Tailwind']
const defaultYears = [2025, 2024, 2023]

function renderFilter(
  overrides: Partial<Parameters<typeof ProjectFilter>[0]> = {},
) {
  const props = {
    tags: defaultTags,
    years: defaultYears,
    selectedTag: null,
    selectedYear: null,
    onTagChange: vi.fn(),
    onYearChange: vi.fn(),
    ...overrides,
  }
  const result = renderWithProviders(<ProjectFilter {...props} />)
  return { ...result, props }
}

describe('ProjectFilter', () => {
  describe('tag filter', () => {
    it('shows an All button and a button for each technology', () => {
      renderFilter()

      expect(screen.getByRole('button', { name: 'All' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'React' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'TypeScript' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'Tailwind' })).toBeDefined()
    })

    it('calls onTagChange with the tag when a tag button is clicked', () => {
      const { props } = renderFilter()

      fireEvent.click(screen.getByRole('button', { name: 'React' }))
      expect(props.onTagChange).toHaveBeenCalledWith('React')

      fireEvent.click(screen.getByRole('button', { name: 'TypeScript' }))
      expect(props.onTagChange).toHaveBeenCalledWith('TypeScript')
    })

    it('calls onTagChange with null when "All" is clicked', () => {
      const { props } = renderFilter({ selectedTag: 'React' })

      fireEvent.click(screen.getByRole('button', { name: 'All' }))
      expect(props.onTagChange).toHaveBeenCalledWith(null)
    })
  })

  describe('year filter', () => {
    it('shows an All Years button and a button for each year', () => {
      renderFilter()

      expect(screen.getByRole('button', { name: 'All Years' })).toBeDefined()
      expect(screen.getByRole('button', { name: '2025' })).toBeDefined()
      expect(screen.getByRole('button', { name: '2024' })).toBeDefined()
      expect(screen.getByRole('button', { name: '2023' })).toBeDefined()
    })

    it('calls onYearChange with the year when a year button is clicked', () => {
      const { props } = renderFilter()

      fireEvent.click(screen.getByRole('button', { name: '2025' }))
      expect(props.onYearChange).toHaveBeenCalledWith(2025)
    })

    it('calls onYearChange with null when "All Years" is clicked', () => {
      const { props } = renderFilter({ selectedYear: 2025 })

      fireEvent.click(screen.getByRole('button', { name: 'All Years' }))
      expect(props.onYearChange).toHaveBeenCalledWith(null)
    })
  })

  it('renders section headings', () => {
    renderFilter()

    expect(screen.getByText('Filter by Technology')).toBeDefined()
    expect(screen.getByText('Filter by Year')).toBeDefined()
  })
})
