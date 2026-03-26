import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDateTime, formatRelativeTime } from '@/lib/format'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Pin to 2026-03-25T12:00:00Z
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for less than 60 seconds ago', () => {
    expect(formatRelativeTime('2026-03-25T11:59:30Z')).toBe('just now')
  })

  it('returns minutes ago for 1-59 minutes', () => {
    expect(formatRelativeTime('2026-03-25T11:55:00Z')).toBe('5m ago')
    expect(formatRelativeTime('2026-03-25T11:01:00Z')).toBe('59m ago')
  })

  it('returns "1m ago" at exactly 60 seconds', () => {
    expect(formatRelativeTime('2026-03-25T11:59:00Z')).toBe('1m ago')
  })

  it('returns hours ago for 1-23 hours', () => {
    expect(formatRelativeTime('2026-03-25T10:00:00Z')).toBe('2h ago')
    expect(formatRelativeTime('2026-03-24T13:00:00Z')).toBe('23h ago')
  })

  it('returns "1h ago" at exactly 60 minutes', () => {
    expect(formatRelativeTime('2026-03-25T11:00:00Z')).toBe('1h ago')
  })

  it('returns days ago for 1-6 days', () => {
    expect(formatRelativeTime('2026-03-24T12:00:00Z')).toBe('1d ago')
    expect(formatRelativeTime('2026-03-19T12:00:00Z')).toBe('6d ago')
  })

  it('falls back to locale date for 7+ days', () => {
    const result = formatRelativeTime('2026-03-10T12:00:00Z')
    expect(result).toBe('Mar 10')
  })

  it('falls back to locale date for much older dates', () => {
    const result = formatRelativeTime('2025-06-15T12:00:00Z')
    expect(result).toBe('Jun 15')
  })
})

describe('formatDateTime', () => {
  it('formats a date as "Jan 5, 2025, 02:30 PM"', () => {
    // Use a date that we construct with known local values
    // formatDateTime uses local time, so create a Date and format it
    const d = new Date(2025, 0, 5, 14, 30)
    const result = formatDateTime(d.toISOString())
    expect(result).toBe('Jan 5, 2025, 02:30 PM')
  })

  it('formats midnight as 12:00 AM', () => {
    const d = new Date(2026, 2, 25, 0, 0)
    const result = formatDateTime(d.toISOString())
    expect(result).toBe('Mar 25, 2026, 12:00 AM')
  })

  it('formats noon as 12:00 PM', () => {
    const d = new Date(2026, 2, 25, 12, 0)
    const result = formatDateTime(d.toISOString())
    expect(result).toBe('Mar 25, 2026, 12:00 PM')
  })

  it('pads minutes with leading zero', () => {
    const d = new Date(2026, 5, 1, 9, 5)
    const result = formatDateTime(d.toISOString())
    expect(result).toBe('Jun 1, 2026, 09:05 AM')
  })

  it('handles PM hours correctly', () => {
    const d = new Date(2026, 11, 31, 23, 59)
    const result = formatDateTime(d.toISOString())
    expect(result).toBe('Dec 31, 2026, 11:59 PM')
  })
})
