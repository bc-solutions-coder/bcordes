import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as projects from '@/features/projects'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const projectsFeatureDir = join(appSrc, 'features/projects')
const projectsFeatureIndex = join(projectsFeatureDir, 'index.ts')
const projectsFeatureComponents = join(projectsFeatureDir, 'components')
const projectsFeatureContent = join(projectsFeatureDir, 'content')
const oldComponentsProjectsDir = join(appSrc, 'components/projects')
const oldContentProjectsDir = join(appSrc, 'content/projects')

const COMPONENT_EXPORTS = ['ProjectCard', 'ProjectFilter'] as const

// Types are erased at runtime; the content re-export assertion covers them separately.
const CONTENT_VALUE_EXPORTS = [
  'getShowcases',
  'getShowcase',
  'getShowcaseContent',
  'getFeaturedShowcases',
] as const

const RUNTIME_EXPORTS = [
  ...COMPONENT_EXPORTS,
  ...CONTENT_VALUE_EXPORTS,
] as const

// Keep paths split to avoid matching this test in sibling source scans.
const OLD_COMPONENTS_PROJECTS_PATH = ['@/components', 'projects'].join('/')
const OLD_CONTENT_PROJECTS_PATH = ['@/content', 'projects'].join('/')

const EXTERNAL_CONSUMERS = [
  'features/home/components/FeaturedWork.tsx',
  'features/home/components/FeaturedWork.test.tsx',
  'routes/index.tsx',
  'routes/index.test.tsx',
  'routes/projects/index.tsx',
  'routes/projects/index.test.ts',
  'routes/projects/index.component.test.tsx',
  'routes/projects/$slug.tsx',
  'routes/projects/$slug.test.ts',
  'routes/projects/$slug.component.test.tsx',
] as const

const readIndex = (): string =>
  existsSync(projectsFeatureIndex)
    ? readFileSync(projectsFeatureIndex, 'utf8')
    : ''

function collectSources(dir: string, acc: Array<string> = []): Array<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSources(full, acc)
    } else if (
      (full.endsWith('.ts') || full.endsWith('.tsx')) &&
      !full.endsWith('routeTree.gen.ts')
    ) {
      acc.push(full)
    }
  }
  return acc
}

describe('features/projects module exists with a public index', () => {
  it('has an apps/web/src/features/projects/ directory', () => {
    expect(existsSync(projectsFeatureDir)).toBe(true)
  })

  it('co-locates a components/ subdirectory', () => {
    expect(existsSync(projectsFeatureComponents)).toBe(true)
  })

  it('co-locates a content/ subdirectory (the moved data module)', () => {
    expect(existsSync(projectsFeatureContent)).toBe(true)
  })

  it('exposes a public API at apps/web/src/features/projects/index.ts', () => {
    expect(existsSync(projectsFeatureIndex)).toBe(true)
  })

  it.each(COMPONENT_EXPORTS)(
    'index.ts re-exports %s from its local components/',
    (name) => {
      const src = readIndex()
      // Allow grouped exports and either quote style.
      const pattern = new RegExp(
        `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]\\./components/`,
      )
      expect(
        pattern.test(src),
        `features/projects/index.ts must re-export ${name} from ./components/*`,
      ).toBe(true)
    },
  )

  it('index.ts re-exports the whole content barrel (incl. ShowcaseMeta type)', () => {
    const src = readIndex()
    // Allow either quote style and an optional /index suffix.
    const pattern = /export\s*\*\s*from\s*['"]\.\/content(?:\/index)?['"]/
    expect(
      pattern.test(src),
      "features/projects/index.ts must `export * from './content'` to surface ShowcaseMeta + getShowcase* helpers",
    ).toBe(true)
  })
})

describe('both horizontal projects directories are gone', () => {
  it('apps/web/src/components/projects/ no longer exists', () => {
    expect(existsSync(oldComponentsProjectsDir)).toBe(false)
  })

  it('apps/web/src/content/projects/ no longer exists', () => {
    expect(existsSync(oldContentProjectsDir)).toBe(false)
  })
})

describe('no source imports the old horizontal projects paths', () => {
  it('no .ts/.tsx under apps/web/src references @/components/projects or @/content/projects', () => {
    const offenders = collectSources(appSrc)
      .filter((f) => f !== fileURLToPath(import.meta.url))
      .filter((f) => {
        const contents = readFileSync(f, 'utf8')
        return (
          contents.includes(OLD_COMPONENTS_PROJECTS_PATH) ||
          contents.includes(OLD_CONTENT_PROJECTS_PATH)
        )
      })
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still reference ${OLD_COMPONENTS_PROJECTS_PATH} or ${OLD_CONTENT_PROJECTS_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

describe('every consumer resolves via the new @/features/projects path', () => {
  it.each(EXTERNAL_CONSUMERS)(
    '%s imports from @/features/projects',
    (relPath) => {
      const full = join(appSrc, relPath)
      expect(existsSync(full), `${relPath} should exist`).toBe(true)
      const contents = existsSync(full) ? readFileSync(full, 'utf8') : ''
      expect(
        contents.includes('@/features/projects'),
        `${relPath} must reference @/features/projects`,
      ).toBe(true)
    },
  )
})

describe('the public API resolves the merged value exports', () => {
  it('@/features/projects exports ProjectCard, ProjectFilter, and the getShowcase* helpers', () => {
    for (const name of RUNTIME_EXPORTS) {
      expect(
        typeof projects[name],
        `@/features/projects must export ${name} as a function`,
      ).toBe('function')
    }
  })
})
