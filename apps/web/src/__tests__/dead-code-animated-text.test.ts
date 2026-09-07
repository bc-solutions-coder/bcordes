import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

// Keep paths split to avoid matching this test in sibling source scans.
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

const SKIP_DIRS = new Set([
  'node_modules',
  '.output',
  'dist',
  'coverage',
  '.git',
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

// Require an import or mock prefix to avoid matching assertion strings.
const LEAD = String.raw`(?:from|import|vi\.mock|require)\s*\(?\s*['"]`

const moduleName = ['Animated', 'Text'].join('')

// Match the module name at the end of one quoted specifier, allowing a TS extension.
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
