import { describe, expect, it } from 'vitest'
import { NAV_LINKS, SOCIAL_LINKS } from '@/config/navigation'

describe('NAV_LINKS', () => {
  it('is a non-empty array', () => {
    expect(NAV_LINKS.length).toBeGreaterThan(0)
  })

  it('each entry has href and label strings', () => {
    for (const link of NAV_LINKS) {
      expect(typeof link.href).toBe('string')
      expect(link.href.startsWith('/')).toBe(true)
      expect(typeof link.label).toBe('string')
      expect(link.label.length).toBeGreaterThan(0)
    }
  })

  it('contains a Home link pointing to /', () => {
    const home = NAV_LINKS.find((l) => l.label === 'Home')
    expect(home).toBeDefined()
    expect(home!.href).toBe('/')
  })
})

describe('SOCIAL_LINKS', () => {
  it('is a non-empty array', () => {
    expect(SOCIAL_LINKS.length).toBeGreaterThan(0)
  })

  it('each entry has label, href, and icon', () => {
    for (const link of SOCIAL_LINKS) {
      expect(typeof link.label).toBe('string')
      expect(link.label.length).toBeGreaterThan(0)
      expect(typeof link.href).toBe('string')
      expect(link.href.length).toBeGreaterThan(0)
      expect(link.icon).toBeDefined()
    }
  })

  it('contains GitHub, LinkedIn, and Email links', () => {
    const labels = SOCIAL_LINKS.map((l) => l.label)
    expect(labels).toContain('GitHub')
    expect(labels).toContain('LinkedIn')
    expect(labels).toContain('Email')
  })

  it('GitHub link points to a github.com URL', () => {
    const gh = SOCIAL_LINKS.find((l) => l.label === 'GitHub')
    expect(gh!.href).toMatch(/^https:\/\/github\.com\//)
  })

  it('Email link uses mailto:', () => {
    const email = SOCIAL_LINKS.find((l) => l.label === 'Email')
    expect(email!.href).toMatch(/^mailto:/)
  })
})
