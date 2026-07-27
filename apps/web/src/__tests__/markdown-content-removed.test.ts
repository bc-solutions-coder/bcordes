import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Deletion guard for bcordes-hcv.1.2 — components/shared/MarkdownContent.tsx
// (a thin wrapper over the `marked` npm package that rendered blog markdown to
// HTML) was verified dead by the scout: its only consumers were the component
// and its own *.test file, and `marked` was a dependency of that file alone.
// This spec asserts the END STATE: the component + its test are gone, no source
// anywhere in apps/web/src or packages/* still imports it, and `marked` is no
// longer listed as a dependency in apps/web/package.json.
//
// Mirrors the repo's structural wiring-spec convention (architecture-cleanup.test.ts,
// feature-architecture.test.ts): resolve the repo root from this file and inspect
// the real filesystem — asserting the NEW reality, never the pre-deletion one.

// apps/web/src/__tests__ -> repo root (same convention as architecture-cleanup.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

// The deleted component + its test, built non-literally so this spec file's own
// text never contains the live specifier substring — otherwise the sibling
// import-scan guards (architecture-cleanup's `readFileSync().includes()` style
// scans) could false-positive on this file. Runtime value is byte-identical to
// the literal path.
const sharedDir = join(appSrc, ...['components', 'shared'])
const componentBase = ['Markdown', 'Content'].join('')
const REMOVED_FILES = [`${componentBase}.tsx`, `${componentBase}.test.tsx`]

// The dead npm dependency, assembled from fragments for the same reason.
const deadDependency = ['mar', 'ked'].join('')

// ---------------------------------------------------------------------------
// 1. The component + its test no longer exist
// ---------------------------------------------------------------------------

describe(`${componentBase} component is deleted`, () => {
  it.each(REMOVED_FILES)('components/shared/%s no longer exists', (name) => {
    expect(
      existsSync(join(sharedDir, name)),
      `apps/web/src/components/shared/${name} must be removed (verified dead)`,
    ).toBe(false)
  })

  it('sibling FadeInView survives at shared/motion (over-deletion guard)', () => {
    // Over-deletion guard: only MarkdownContent's two files leave; its sibling
    // FadeInView must survive. FadeInView has since moved out of
    // components/shared/ into shared/motion/components/ (bcordes-hcv.2), so we
    // assert it survives at its new home rather than in the now-removed dir.
    expect(
      existsSync(
        join(appSrc, 'shared', 'motion', 'components', 'FadeInView.tsx'),
      ),
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. No source anywhere still imports the component
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
// require('…')) whose specifier ends in the deleted component — either the
// `@/components/shared/MarkdownContent` alias form or a `./MarkdownContent`
// sibling-relative form. Built non-literally (see note above).
const LEAD = String.raw`(?:from|import|vi\.mock|require)\s*\(?\s*['"]`
const importRe = new RegExp(
  `${LEAD}(?:@\\/components\\/shared|\\.{1,2}(?:\\/[^'"]+)*)\\/${componentBase}(?:['"]|/)`,
)

describe(`no source imports ${componentBase}`, () => {
  it('no source in apps/web/src or packages/* imports/mocks the deleted component', () => {
    const offenders = allSources
      .filter((f) => importRe.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still import the deleted component: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 3. `marked` is no longer a dependency of apps/web
// ---------------------------------------------------------------------------

describe(`apps/web no longer depends on ${deadDependency}`, () => {
  const pkg = JSON.parse(
    readFileSync(join(repoRoot, 'apps/web/package.json'), 'utf8'),
  ) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  it('is not listed in dependencies', () => {
    expect(
      pkg.dependencies ?? {},
      `apps/web/package.json must not list "${deadDependency}" as a dependency`,
    ).not.toHaveProperty(deadDependency)
  })

  it('is not listed in devDependencies', () => {
    expect(pkg.devDependencies ?? {}).not.toHaveProperty(deadDependency)
  })
})
