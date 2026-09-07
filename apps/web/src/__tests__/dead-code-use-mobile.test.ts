import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

// Keep paths split to avoid matching this test in sibling source scans.
const moduleBase = ['use', 'mobile'].join('-')

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

const SKIP_DIRS = new Set([
  'node_modules',
  '.output',
  'dist',
  'coverage',
  '.git',
  '.worktrees',
])

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

// Require an import or mock prefix and match within one quoted specifier, allowing a TS extension.
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
