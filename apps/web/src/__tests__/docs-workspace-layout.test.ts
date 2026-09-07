import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8')

const hasClaude = existsSync(join(repoRoot, 'CLAUDE.md'))
const CLAUDE = hasClaude ? read('CLAUDE.md') : ''
const README = read('README.md')

// Discover packages from disk so documentation checks include new packages.
const packageNames = readdirSync(join(repoRoot, 'packages'))
  .filter((entry) =>
    existsSync(join(repoRoot, 'packages', entry, 'package.json')),
  )
  .sort()

const STALE_SUBSTRINGS = [
  'src/lib/wallow',
  'src/lib/auth',
  'src/lib/valkey',
  'src/hooks/useSignalR',
  '@microsoft/signalr',
  'useSignalR',
]

const grepStale = (doc: string) =>
  STALE_SUBSTRINGS.filter((s) => doc.includes(s)).concat(
    /signalr/i.test(doc) ? ['SignalR (case-insensitive)'] : [],
  )

describe('doc coverage sanity', () => {
  it('discovers the extracted packages/* set (13: auth..wallow)', () => {
    // Prevent empty discovery from passing the documentation checks.
    expect(packageNames).toContain('wallow')
    expect(packageNames).toContain('auth')
    expect(packageNames.length).toBeGreaterThanOrEqual(13)
  })
})

describe.skipIf(!hasClaude)(
  'CLAUDE.md reflects the pnpm workspace layout',
  () => {
    it('documents the apps/web + packages/* monorepo layout, not a single-app src/ tree', () => {
      expect(
        CLAUDE,
        'CLAUDE.md must mention the apps/web application root',
      ).toMatch(/apps\/web/)
      expect(CLAUDE, 'CLAUDE.md must mention the packages/* workspace').toMatch(
        /packages\//,
      )
    })

    it('lists every extracted internal package (package list / dependency graph)', () => {
      const missing = packageNames.filter(
        (name) =>
          !CLAUDE.includes(`packages/${name}`) &&
          !CLAUDE.includes(`@bcordes/${name}`),
      )
      expect(
        missing,
        `CLAUDE.md must document these packages (as packages/<name> or @bcordes/<name>): ${missing.join(', ')}`,
      ).toEqual([])
    })

    it('carries no stale pre-migration src/lib/* or SignalR references', () => {
      expect(
        grepStale(CLAUDE),
        'CLAUDE.md still references the pre-migration layout',
      ).toEqual([])
    })

    it('describes the real-time mechanism as SSE, not SignalR', () => {
      expect(
        CLAUDE,
        'CLAUDE.md real-time docs must name SSE / server-sent events',
      ).toMatch(/SSE|server-sent events/i)
      expect(
        CLAUDE,
        'CLAUDE.md must not mention SignalR as the realtime stack',
      ).not.toMatch(/signalr/i)
    })

    it('points the session-store note at sealed cookies, not the stale "in memory Map" phrasing', () => {
      expect(CLAUDE).not.toMatch(/in memory Map/i)
    })

    it('updates the no-barrel rule: package src/index.ts is the sanctioned public API', () => {
      expect(
        CLAUDE,
        'no-barrel rule must reference packages/valkey/src/index.ts',
      ).toMatch(/packages\/valkey\/src\/index\.ts/)
      expect(
        CLAUDE,
        'no-barrel rule must note package src/index.ts as the public-API exception',
      ).toMatch(/src\/index\.ts/)
    })
  },
)

describe('README.md reflects the pnpm workspace layout', () => {
  const projectStructure = (() => {
    const start = README.indexOf('## Project structure')
    if (start === -1) return ''
    const rest = README.slice(start + '## Project structure'.length)
    const end = rest.indexOf('\n## ')
    return end === -1 ? rest : rest.slice(0, end)
  })()

  it('has a Project Structure section documenting apps/web + packages/*', () => {
    expect(
      projectStructure,
      'README Project Structure section not found',
    ).not.toBe('')
    expect(
      projectStructure,
      'Project Structure must show the apps/web application root',
    ).toMatch(/apps\/web/)
    expect(
      projectStructure,
      'Project Structure must show the packages/* workspace',
    ).toMatch(/packages\//)
  })

  it('names every extracted internal package', () => {
    const missing = packageNames.filter((name) => !README.includes(name))
    expect(
      missing,
      `README must document these packages: ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('no longer shows the old single-app src/lib subtree (lib/auth, lib/wallow)', () => {
    expect(README).not.toMatch(/lib\/auth/)
    expect(README).not.toMatch(/lib\/wallow/)
  })

  it('carries no stale SignalR references', () => {
    expect(grepStale(README)).toEqual([])
  })
})
