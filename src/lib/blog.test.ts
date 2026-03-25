import { describe, expect, it } from 'vitest'
import { formatDate } from '@/lib/blog'

describe('formatDate', () => {
  it('formats an ISO date string to en-US locale output', () => {
    // Use midday UTC to avoid timezone-induced day shift
    const result = formatDate('2026-01-15T12:00:00Z')
    expect(result).toBe('January 15, 2026')
  })

  it('formats a date with time component', () => {
    const result = formatDate('2024-07-04T14:30:00Z')
    expect(result).toBe('July 4, 2024')
  })

  it('formats dates in different months', () => {
    expect(formatDate('2025-12-25T12:00:00Z')).toBe('December 25, 2025')
    expect(formatDate('2026-06-01T12:00:00Z')).toBe('June 1, 2026')
  })

  it('formats first day of year', () => {
    const result = formatDate('2026-01-01T12:00:00Z')
    expect(result).toBe('January 1, 2026')
  })

  it('formats last day of year', () => {
    const result = formatDate('2025-12-31T12:00:00Z')
    expect(result).toBe('December 31, 2025')
  })
})
