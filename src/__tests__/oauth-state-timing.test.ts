import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_PATH = resolve(
  __dirname,
  '..',
  'routes',
  'auth',
  'callback.ts',
)

function readSource(): string {
  return readFileSync(SOURCE_PATH, 'utf-8')
}

describe('OAuth callback — timing-safe state comparison', () => {
  it('should use timingSafeEqual instead of === for state comparison', () => {
    const source = readSource()

    // Must not use === for state comparison
    const stateComparisonLine = source
      .split('\n')
      .find((line) => line.includes('state') && line.includes('storedState') && line.includes('==='))

    expect(stateComparisonLine).toBeUndefined()

    // Must use timingSafeEqual
    expect(source).toContain('timingSafeEqual')
  })

  it('should import timingSafeEqual from node:crypto', () => {
    const source = readSource()
    expect(source).toMatch(/import.*timingSafeEqual.*from\s+['"]node:crypto['"]/)
  })
})
