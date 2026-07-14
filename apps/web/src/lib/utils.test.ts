import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resolves conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('bg-white', 'bg-black')).toBe('bg-black')
  })

  it('handles conditional class names with falsy values', () => {
    // Pass undefined, null, and empty string to verify they are ignored
    expect(cn('base', undefined, null, '', 'extra')).toBe('base extra')
  })

  it('returns empty string for no input', () => {
    expect(cn()).toBe('')
  })

  it('returns empty string for all-falsy input', () => {
    expect(cn(false, null, undefined, '')).toBe('')
  })

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('handles object inputs for conditional classes', () => {
    expect(cn({ hidden: true, visible: false })).toBe('hidden')
  })

  it('merges conflicting Tailwind modifiers correctly', () => {
    expect(cn('hover:bg-red-500', 'hover:bg-blue-500')).toBe(
      'hover:bg-blue-500',
    )
  })
})
