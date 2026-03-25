import { describe, expect, it } from 'vitest'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_TO_API,
  STATUS_TO_FRONTEND,
} from '@/config/inquiries'

describe('STATUS_TO_FRONTEND / STATUS_TO_API roundtrip', () => {
  it('every STATUS_TO_FRONTEND value maps back to its key via STATUS_TO_API', () => {
    for (const [apiKey, frontendValue] of Object.entries(STATUS_TO_FRONTEND)) {
      expect(STATUS_TO_API[frontendValue]).toBe(apiKey)
    }
  })

  it('every STATUS_TO_API value maps back to its key via STATUS_TO_FRONTEND', () => {
    for (const [frontendKey, apiValue] of Object.entries(STATUS_TO_API)) {
      expect(STATUS_TO_FRONTEND[apiValue]).toBe(frontendKey)
    }
  })

  it('both maps have the same number of entries', () => {
    expect(Object.keys(STATUS_TO_FRONTEND).length).toBe(
      Object.keys(STATUS_TO_API).length,
    )
  })
})

describe('STATUS_COLORS', () => {
  it('has an entry for every frontend status', () => {
    for (const frontendStatus of Object.values(STATUS_TO_FRONTEND)) {
      expect(STATUS_COLORS[frontendStatus]).toBeDefined()
      expect(typeof STATUS_COLORS[frontendStatus]).toBe('string')
      expect(STATUS_COLORS[frontendStatus].length).toBeGreaterThan(0)
    }
  })

  it('all color strings contain Tailwind class patterns', () => {
    for (const classes of Object.values(STATUS_COLORS)) {
      // Each should have bg, text, and border classes
      expect(classes).toMatch(/bg-/)
      expect(classes).toMatch(/text-/)
      expect(classes).toMatch(/border-/)
    }
  })
})

describe('STATUS_LABELS', () => {
  it('has an entry for every frontend status', () => {
    for (const frontendStatus of Object.values(STATUS_TO_FRONTEND)) {
      expect(STATUS_LABELS[frontendStatus]).toBeDefined()
      expect(typeof STATUS_LABELS[frontendStatus]).toBe('string')
      expect(STATUS_LABELS[frontendStatus].length).toBeGreaterThan(0)
    }
  })

  it('label values match the API status keys (PascalCase)', () => {
    for (const [frontendStatus, label] of Object.entries(STATUS_LABELS)) {
      expect(STATUS_TO_API[frontendStatus]).toBe(label)
    }
  })
})
