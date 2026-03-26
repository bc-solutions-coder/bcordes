import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { ProjectFilter } from './ProjectFilter'
import { renderWithProviders } from '@/test/helpers/render'

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
    it('renders all tag buttons plus the "All" button', () => {
      renderFilter()

      // Total buttons = 4 (tag: All + 3 tags) + 4 (year: All Years + 3 years) = 8
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(8)

      expect(screen.getByText('All')).toBeDefined()
      expect(screen.getByText('React')).toBeDefined()
      expect(screen.getByText('TypeScript')).toBeDefined()
      expect(screen.getByText('Tailwind')).toBeDefined()
    })

    it('calls onTagChange with the tag when a tag button is clicked', () => {
      const { props } = renderFilter()

      fireEvent.click(screen.getByText('React'))
      expect(props.onTagChange).toHaveBeenCalledWith('React')

      fireEvent.click(screen.getByText('TypeScript'))
      expect(props.onTagChange).toHaveBeenCalledWith('TypeScript')
    })

    it('calls onTagChange with null when "All" is clicked', () => {
      const { props } = renderFilter({ selectedTag: 'React' })

      fireEvent.click(screen.getByText('All'))
      expect(props.onTagChange).toHaveBeenCalledWith(null)
    })

    it('renders selected tag badge with active styling', () => {
      renderFilter({ selectedTag: 'React' })

      const reactBadge = screen.getByText('React')
      const allBadge = screen.getByText('All')

      expect(reactBadge.className).toContain('bg-primary')
      expect(allBadge.className).toContain('border-border')
    })

    it('renders "All" badge as selected when no tag is selected', () => {
      renderFilter({ selectedTag: null })

      const allBadge = screen.getByText('All')
      expect(allBadge.className).toContain('bg-primary')
    })
  })

  describe('year filter', () => {
    it('renders all year buttons plus the "All Years" button', () => {
      renderFilter()

      expect(screen.getByText('All Years')).toBeDefined()
      expect(screen.getByText('2025')).toBeDefined()
      expect(screen.getByText('2024')).toBeDefined()
      expect(screen.getByText('2023')).toBeDefined()
    })

    it('calls onYearChange with the year when a year button is clicked', () => {
      const { props } = renderFilter()

      fireEvent.click(screen.getByText('2025'))
      expect(props.onYearChange).toHaveBeenCalledWith(2025)
    })

    it('calls onYearChange with null when "All Years" is clicked', () => {
      const { props } = renderFilter({ selectedYear: 2025 })

      fireEvent.click(screen.getByText('All Years'))
      expect(props.onYearChange).toHaveBeenCalledWith(null)
    })

    it('renders selected year badge with active styling', () => {
      renderFilter({ selectedYear: 2024 })

      const yearBadge = screen.getByText('2024')
      expect(yearBadge.className).toContain('bg-primary')
    })

    it('renders "All Years" as selected when no year is selected', () => {
      renderFilter({ selectedYear: null })

      const allYearsBadge = screen.getByText('All Years')
      expect(allYearsBadge.className).toContain('bg-primary')
    })
  })

  it('renders section headings', () => {
    renderFilter()

    expect(screen.getByText('Filter by Technology')).toBeDefined()
    expect(screen.getByText('Filter by Year')).toBeDefined()
  })
})
