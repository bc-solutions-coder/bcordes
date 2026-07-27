import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Regression guard for bcordes-hcv.1.1 — components/shared/AnimatedText.tsx was
// verified dead (zero non-test consumers repo-wide) and deleted together with its
// co-located test file. This spec asserts the END STATE: both files are gone and
// no source under apps/web/src OR packages/* imports/mocks the AnimatedText module.
//
// Mirrors architecture-cleanup.test.ts: resolve the repo root from this file and
// inspect the real filesystem. Specifiers/paths are built non-literally via
// [...].join('/') (the sibling guards' convention) so this file's own text never
// contains a real import specifier substring the feature-module guards'
// readFileSync().includes() scans could false-positive on.

// apps/web/src/__tests__ -> repo root (same convention as architecture-cleanup.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

// apps/web/src-relative paths of the deleted files, built non-literally.
const DELETED_FILES = [
  ['components', 'shared', 'AnimatedText.tsx'].join('/'),
  ['components', 'shared', 'AnimatedText.test.tsx'].join('/'),
]

describe('AnimatedText dead-code removal', () => {
  it.each(DELETED_FILES)('apps/web/src/%s no longer exists', (rel) => {
    expect(
      existsSync(join(appSrc, rel)),
      `apps/web/src/${rel} must be deleted (verified-dead per bcordes-hcv.1.1)`,
    ).toBe(false)
  })

  it('sibling FadeInView survives at shared/motion (over-deletion guard)', () => {
    // Over-deletion guard: the AnimatedText deletion must not have taken its
    // sibling FadeInView with it. FadeInView has since moved out of
    // components/shared/ into shared/motion/components/ (bcordes-hcv.2), so we
    // assert it survives at its new home rather than in the now-removed dir.
    expect(
      existsSync(
        join(
          appSrc,
          ['shared', 'motion', 'components', 'FadeInView.tsx'].join('/'),
        ),
      ),
      'FadeInView.tsx must survive at shared/motion/components/',
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// No source imports/mocks the deleted AnimatedText module
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

// An import/mock statement leading token (same convention as the sibling guards)
// so prose or a guard's own assertion string is never a false positive; only a
// real module reference is flagged.
const LEAD = String.raw`(?:from|import|vi\.mock|require)\s*\(?\s*['"]`

// Component/module name assembled non-literally so this file's own text carries no
// literal AnimatedText import specifier.
const moduleName = ['Animated', 'Text'].join('')

// A real import/mock whose specifier ends at the AnimatedText module (alias
// `@/components/shared/AnimatedText` or a relative `./AnimatedText`), with an
// optional .ts/.tsx extension, immediately before the closing quote. `[^'"]*`
// keeps the match confined to a single quoted specifier.
const animatedTextImportRe = new RegExp(
  `${LEAD}[^'"]*${moduleName}(?:\\.tsx?)?['"]`,
)

describe('no source imports the deleted AnimatedText module', () => {
  it('nothing under apps/web/src or packages/* imports/mocks AnimatedText', () => {
    const offenders = allSources
      .filter((f) => animatedTextImportRe.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still import the deleted AnimatedText module: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})
