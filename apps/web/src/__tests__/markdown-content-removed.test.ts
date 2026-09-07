import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

// Keep paths split to avoid matching this test in sibling source scans.
const sharedDir = join(appSrc, ...['components', 'shared'])
const componentBase = ['Markdown', 'Content'].join('')
const REMOVED_FILES = [`${componentBase}.tsx`, `${componentBase}.test.tsx`]

const deadDependency = ['mar', 'ked'].join('')

describe(`${componentBase} component is deleted`, () => {
  it.each(REMOVED_FILES)('components/shared/%s no longer exists', (name) => {
    expect(
      existsSync(join(sharedDir, name)),
      `apps/web/src/components/shared/${name} must be removed (verified dead)`,
    ).toBe(false)
  })

  it('sibling FadeInView survives at shared/motion (over-deletion guard)', () => {
    expect(
      existsSync(
        join(appSrc, 'shared', 'motion', 'components', 'FadeInView.tsx'),
      ),
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

// Match imports and mocks using the old alias or a relative module path.
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
