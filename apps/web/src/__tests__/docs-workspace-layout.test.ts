import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Doc-staleness wiring spec (F13 / bcordes-0i2.13.2). The pnpm-workspace
// migration relocated every extracted library out of the old single-app
// `src/lib/*` tree into top-level `packages/*`, and the real-time mechanism is
// Server-Sent Events (apps/web/src/routes/api/events?subscribe=Notifications,Inquiries.ts +
// useEventStreamEvents/EventStreamProvider), NOT SignalR — there is no
// @microsoft/signalr or useSignalR left anywhere in the codebase. CLAUDE.md and
// README.md still describe the pre-migration layout, so these specs assert the
// docs reflect the NEW monorepo reality. Mirrors the repo's config/doc test
// convention (workspace-infra.test.ts, packages/config/typecheck-coverage.test.ts):
// resolve the repo root from this file, read the doc, grep for the new reality
// and against the stale one.
//
// apps/web/src/__tests__ -> repo root (same convention as workspace-infra.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8')

const hasClaude = existsSync(join(repoRoot, 'CLAUDE.md'))
const CLAUDE = hasClaude ? read('CLAUDE.md') : ''
const README = read('README.md')

/**
 * The real internal packages, discovered from the filesystem (mirroring
 * pnpm-workspace.yaml's `packages/*` glob) so a newly-extracted package is
 * covered without editing a hard-coded list. Each is published under the
 * @bcordes/ scope and lives at packages/<name>/.
 */
const packageNames = readdirSync(join(repoRoot, 'packages'))
  .filter((entry) =>
    existsSync(join(repoRoot, 'packages', entry, 'package.json')),
  )
  .sort()

// Stale references to the pre-migration single-app layout. Each names code that
// has physically moved into packages/*, so any surviving occurrence in the docs
// is wrong. (`@microsoft/signalr` / `useSignalR` / SignalR describe a realtime
// stack that no longer exists — it is SSE now.)
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
    // Floor guard: if discovery returns nothing the assertions below pass
    // vacuously. The migration extracted 13 packages.
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
      // The migrated valkey exception now lives at packages/valkey/src/index.ts,
      // and each package's src/index.ts is its public API (the sanctioned barrel).
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
    const start = README.indexOf('## Project Structure')
    if (start === -1) return ''
    const rest = README.slice(start + '## Project Structure'.length)
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
