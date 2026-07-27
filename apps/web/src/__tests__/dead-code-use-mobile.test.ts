import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Regression guard for bcordes-hcv.1.3 — hooks/use-mobile.ts exported
// useIsMobile(), a viewport-breakpoint hook (leftover shadcn scaffold). The
// scout verified it dead: its only references repo-wide were the hook file, its
// co-located *.test file, and architecture-cleanup.test.ts's SURVIVING_PATHS
// guard string (not a real consumer). This spec asserts the END STATE: both
// files are gone and no source under apps/web/src OR packages/* imports/mocks
// the module.
//
// Mirrors the sibling dead-code guards (dead-code-animated-text.test.ts,
// markdown-content-removed.test.ts): resolve the repo root from this file and
// inspect the real filesystem. Specifiers/paths are built non-literally via
// [...].join(...) (the sibling guards' convention) so this file's own text never
// contains a real import-specifier substring the feature-module guards'
// readFileSync().includes() scans could false-positive on.

// apps/web/src/__tests__ -> repo root (same convention as architecture-cleanup.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

// kebab base of the deleted module, assembled from fragments (see note above).
const moduleBase = ['use', 'mobile'].join('-')

// apps/web/src-relative paths of the deleted files, built non-literally.
const DELETED_FILES = [
  ['hooks', `${moduleBase}.ts`].join('/'),
  ['hooks', `${moduleBase}.test.ts`].join('/'),
]

describe('use-mobile dead-code removal', () => {
  it.each(DELETED_FILES)('apps/web/src/%s no longer exists', (rel) => {
    expect(
      existsSync(join(appSrc, rel)),
      `apps/web/src/${rel} must be deleted (verified-dead per bcordes-hcv.1.3)`,
    ).toBe(false)
  })

  it('sibling motion hooks survive at shared/motion (over-deletion guard)', () => {
    // Over-deletion guard: the use-mobile deletion must not have taken the other
    // hooks with it. useReducedMotion + useScrollAnimation have since moved out
    // of hooks/ into shared/motion/hooks/ (bcordes-hcv.2), so we assert they
    // survive at their new home rather than in the now-removed hooks/ dir.
    expect(
      existsSync(
        join(appSrc, 'shared', 'motion', 'hooks', 'useReducedMotion.ts'),
      ),
      'useReducedMotion.ts must survive at shared/motion/hooks/',
    ).toBe(true)
    expect(
      existsSync(
        join(appSrc, 'shared', 'motion', 'hooks', 'useScrollAnimation.ts'),
      ),
      'useScrollAnimation.ts must survive at shared/motion/hooks/',
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// No source imports/mocks the deleted use-mobile module
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules',
  '.output',
  'dist',
  'coverage',
  '.git',
  '.worktrees',
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

// A real import/mock reference (from '…' / import('…') / vi.mock('…') /
// require('…')) whose specifier ends in the deleted module — either the
// `@/hooks/use-mobile` alias form or a `./use-mobile` sibling-relative form,
// with an optional .ts extension immediately before the closing quote. `[^'"]*`
// keeps the match confined to a single quoted specifier. Built non-literally.
const LEAD = String.raw`(?:from|import|vi\.mock|require)\s*\(?\s*['"]`
const importRe = new RegExp(`${LEAD}[^'"]*${moduleBase}(?:\\.tsx?)?['"]`)

describe('no source imports the deleted use-mobile module', () => {
  it('nothing under apps/web/src or packages/* imports/mocks use-mobile', () => {
    const offenders = allSources
      .filter((f) => importRe.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still import the deleted use-mobile module: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})
