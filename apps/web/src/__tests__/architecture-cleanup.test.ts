import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Final-cleanup wiring spec (bcordes-6ow.9 / .9.1) — the closing task of the
// feature-based-architecture refactor. The six feature/shared migrations have
// each relocated their code; this task removes the now-empty horizontal
// directories those moves left behind, proves no source still reaches for a
// stale pre-migration specifier, and finalises CLAUDE.md/README so the docs
// describe the features/ + shared/ layout (satisfying the doc-staleness guard).
//
// These specs assert the END STATE: (1) the emptied horizontal dirs (server-fns/,
// content/, and the per-feature components/* leaves) are gone while the genuinely
// shared surface (components/{layout,shared}, config/navigation, lib/web-vitals,
// hooks) survives; (2) no real import/mock across apps/web/src OR packages/*
// points at a migrated-away path or reaches deep into a module's internals; and
// (3) the CLAUDE.md Key Directories block and the README Project Structure tree
// show features/ + shared/ and no longer advertise server-fns/, content/, or the
// per-feature components/* dirs.
//
// Mirrors the repo's structural wiring-spec convention (feature-architecture.test.ts,
// docs-workspace-layout.test.ts): resolve the repo root from this file and inspect
// the real filesystem / docs — asserting the NEW reality, never the pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as feature-architecture.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

const CLAUDE = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8')
const README = readFileSync(join(repoRoot, 'README.md'), 'utf8')

/** Slice a markdown doc between a heading and the next heading of the same level. */
const section = (doc: string, heading: string): string => {
  const start = doc.indexOf(heading)
  if (start === -1) return ''
  const rest = doc.slice(start + heading.length)
  const level = heading.match(/^#+/)?.[0] ?? '##'
  const end = rest.indexOf(`\n${level} `)
  return end === -1 ? rest : rest.slice(0, end)
}

const keyDirs = section(CLAUDE, '### Key Directories')
const projectStructure = section(README, '## Project Structure')

// ---------------------------------------------------------------------------
// 1. Emptied horizontal directories removed
// ---------------------------------------------------------------------------

// The horizontal per-feature dirs each migration emptied. After cleanup none of
// these should exist under apps/web/src.
const REMOVED_DIRS = [
  'components/home',
  'components/about',
  'components/projects',
  'components/contact',
  'components/dashboard',
  'server-fns',
  'content',
]

// The genuinely shared surface that MUST survive the cleanup (over-deletion guard).
const SURVIVING_PATHS = [
  'components/layout',
  'components/shared',
  'config/navigation.ts',
  'lib/web-vitals.ts',
  'hooks/use-mobile.ts',
  'hooks/useReducedMotion.ts',
  'hooks/useScrollAnimation.ts',
]

describe('emptied horizontal directories are removed', () => {
  it.each(REMOVED_DIRS)('apps/web/src/%s no longer exists', (rel) => {
    expect(
      existsSync(join(appSrc, rel)),
      `apps/web/src/${rel} must be removed after the migration`,
    ).toBe(false)
  })

  it('config/inquiries.ts is gone (moved into features/inquiries)', () => {
    expect(existsSync(join(appSrc, 'config/inquiries.ts'))).toBe(false)
  })

  it.each(SURVIVING_PATHS)('shared surface apps/web/src/%s survives', (rel) => {
    expect(
      existsSync(join(appSrc, rel)),
      `apps/web/src/${rel} must NOT be deleted by the cleanup`,
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. No stale deep-import specifiers anywhere in apps/web/src or packages/*
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules',
  '.output',
  'dist',
  'coverage',
  '.git',
])

/** All .ts/.tsx source files under a root (excludes generated route tree + self). */
function collectSources(dir: string, acc: Array<string> = []): Array<string> {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSources(full, acc)
    } else if (
      (full.endsWith('.ts') || full.endsWith('.tsx')) &&
      !full.endsWith('routeTree.gen.ts') &&
      full !== selfPath
    ) {
      acc.push(full)
    }
  }
  return acc
}

const allSources = [
  ...collectSources(appSrc),
  ...collectSources(join(repoRoot, 'packages')),
]

// An import/mock statement leading token — so prose or a guard's own assertion
// STRING (e.g. `['@/components', 'home'].join('/')`) is not a false positive;
// only a real module reference (from '…' / import('…') / vi.mock('…') / require('…'))
// is flagged.
const LEAD = String.raw`(?:from|import|vi\.mock|require)\s*\(?\s*['"]`

// Migrated-away specifiers: their code now lives under features/* or shared/*.
// Built non-literally (mirroring the sibling feature-module guards' `[...].join('/')`
// convention) so this spec file's own text never contains a stale specifier
// substring — otherwise those guards' `readFileSync().includes()` scans would
// false-positive on this file. Runtime values are byte-identical to the literals.
const STALE_SPECIFIERS = [
  ['@/components', 'home'].join('/'),
  ['@/components', 'about'].join('/'),
  ['@/components', 'projects'].join('/'),
  ['@/components', 'contact'].join('/'),
  ['@/components', 'dashboard'].join('/'),
  ['@/content', 'projects'].join('/'),
  ['@/server-fns', 'inquiries'].join('/'),
  ['@/server-fns', 'notifications'].join('/'),
  ['@/server-fns', 'auth'].join('/'),
  ['@/config', 'inquiries'].join('/'),
  ['@/lib', 'notifications'].join('/'),
  ['@/hooks', 'useUser'].join('/'),
]

// A real import/mock of any migrated-away specifier (specifier followed by a
// quote or a deeper path segment).
const staleImportRe = new RegExp(
  `${LEAD}(?:${STALE_SPECIFIERS.map((s) => s.replace(/[/]/g, '\\/')).join(
    '|',
  )})(?:['"]|/)`,
)

// A real import/mock reaching DEEP into a module's internals
// (@/features/<name>/… or @/shared/<name>/…) — bare @/features/<name> is fine.
const deepModuleRe = new RegExp(
  `${LEAD}@\\/(?:features|shared)\\/[a-z0-9-]+\\/`,
)

describe('no stale deep-import specifiers remain', () => {
  it('no source imports/mocks a migrated-away path', () => {
    const offenders = allSources
      .filter((f) => staleImportRe.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still import a migrated-away specifier: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('no source reaches deep into a feature/shared module (@/features/*/* or @/shared/*/*)', () => {
    const offenders = allSources
      .filter((f) => deepModuleRe.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files deep-import a module's internals (use the bare @/features/<name> or @/shared/<name>): ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 3. Docs describe the feature-based layout (doc-staleness guard)
// ---------------------------------------------------------------------------

describe('CLAUDE.md Key Directories describe the features/ + shared/ layout', () => {
  it('has a Key Directories section', () => {
    expect(keyDirs, 'CLAUDE.md Key Directories section not found').not.toBe('')
  })

  it('lists apps/web/src/features/ and apps/web/src/shared/', () => {
    expect(keyDirs, 'Key Directories must document features/').toMatch(
      /apps\/web\/src\/features\//,
    )
    expect(keyDirs, 'Key Directories must document shared/').toMatch(
      /apps\/web\/src\/shared\//,
    )
  })

  it('no longer advertises the removed apps/web/src/server-fns/ dir', () => {
    expect(
      keyDirs,
      'Key Directories must not list the removed server-fns/ dir',
    ).not.toMatch(/server-fns/)
  })

  it('no longer advertises the removed apps/web/src/content/ dir', () => {
    expect(
      keyDirs,
      'Key Directories must not list the removed content/ dir',
    ).not.toMatch(/apps\/web\/src\/content\//)
  })

  it('no longer enumerates the per-feature components/{home,about,...} dirs', () => {
    // Post-cleanup only components/{layout,shared} remain; the stale
    // components/{home,about,contact,projects,layout,shared} enumeration must go.
    expect(
      keyDirs,
      'Key Directories must not enumerate the migrated-away per-feature component dirs',
    ).not.toMatch(/components\/\{[^}]*\b(?:home|about|contact|projects)\b/)
  })

  it('preserves the packages/valkey/src/index.ts sanctioned-barrel reference', () => {
    // docs-workspace-layout guard invariant — must survive the docs edit.
    expect(CLAUDE).toMatch(/packages\/valkey\/src\/index\.ts/)
  })
})

describe('README Project Structure describes the features/ + shared/ layout', () => {
  it('has a Project Structure section', () => {
    expect(
      projectStructure,
      'README Project Structure section not found',
    ).not.toBe('')
  })

  it('shows the features/ and shared/ module roots in the tree', () => {
    expect(
      projectStructure,
      'Project Structure tree must show the features/ root',
    ).toMatch(/features\//)
    expect(
      projectStructure,
      'Project Structure tree must show the shared/ root',
    ).toMatch(/shared\//)
  })

  it('no longer shows the removed server-fns/ dir', () => {
    expect(
      projectStructure,
      'Project Structure must not show the removed server-fns/ dir',
    ).not.toMatch(/server-fns/)
  })

  it('no longer shows the removed content/ dir', () => {
    expect(
      projectStructure,
      'Project Structure must not show the removed content/ dir',
    ).not.toMatch(/content\//)
  })
})
