import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Projects feature-module migration wiring spec (bcordes-6ow.4 / .4.1).
//
// Task 3 of the feature-based-architecture refactor MERGES two horizontal
// directories — apps/web/src/components/projects/* AND apps/web/src/content/projects/*
// — into a single self-contained feature module at apps/web/src/features/projects/,
// exposing a public API via its own index.ts and repointing every consumer at the
// bare @/features/projects entry point. After the move:
//   * components/projects/ moves to features/projects/components/
//   * content/projects/   moves to features/projects/content/ (its index.ts remains
//     the sanctioned scoped-module barrel per CLAUDE.md's no-barrel exception)
//   * features/projects/index.ts re-exports the two project components
//     (ProjectCard, ProjectFilter) from ./components AND re-exports the entire
//     content barrel surface via `export * from './content'` — that surface
//     includes the ShowcaseMeta type plus getShowcases / getShowcase /
//     getShowcaseContent / getFeaturedShowcases.
//   * neither the old @/components/projects nor @/content/projects path is
//     referenced by any source under apps/web/src (static imports AND vi.mock
//     module-path string keys), and the public API actually resolves the merged
//     value exports.
//
// Mirrors the repo's structural wiring-spec convention (home-feature-module.test.ts,
// about-feature-module.test.ts): resolve the repo root from this file, inspect the
// real filesystem / config, and confirm the new reality — never the pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as home/about-feature-module).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const projectsFeatureDir = join(appSrc, 'features/projects')
const projectsFeatureIndex = join(projectsFeatureDir, 'index.ts')
const projectsFeatureComponents = join(projectsFeatureDir, 'components')
const projectsFeatureContent = join(projectsFeatureDir, 'content')
const oldComponentsProjectsDir = join(appSrc, 'components/projects')
const oldContentProjectsDir = join(appSrc, 'content/projects')

// The two project components the scout confirmed are each NAMED exports (function
// declarations) — the component half of the module's public API surface.
const COMPONENT_EXPORTS = ['ProjectCard', 'ProjectFilter'] as const

// The content barrel's value exports (functions) that `export * from './content'`
// must surface through the feature index. The ShowcaseMeta / Showcase types are
// erased at runtime, so they are asserted structurally (the `export *` re-export)
// rather than via the runtime import below.
const CONTENT_VALUE_EXPORTS = [
  'getShowcases',
  'getShowcase',
  'getShowcaseContent',
  'getFeaturedShowcases',
] as const

// The full set of runtime function exports the merged public API must resolve.
const RUNTIME_EXPORTS = [
  ...COMPONENT_EXPORTS,
  ...CONTENT_VALUE_EXPORTS,
] as const

// The two stale deep-import paths this migration must eliminate. Built by joining
// so this spec file itself is not a false positive when it scans the source tree.
const OLD_COMPONENTS_PROJECTS_PATH = ['@/components', 'projects'].join('/')
const OLD_CONTENT_PROJECTS_PATH = ['@/content', 'projects'].join('/')

// Consumers that reference the projects public surface and must be repointed at the
// bare @/features/projects entry point. These route/feature files do NOT move (only
// components/projects and content/projects relocate), so their paths are stable and
// each must reference '@/features/projects' after the migration.
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

/** All .ts/.tsx source files under apps/web/src (excludes generated route tree). */
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
      // Match `export { Name } from './components/Name'` (allowing extra names
      // in the same brace group and either quote style).
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
    // `export * from './content'` surfaces the sanctioned scoped-module barrel
    // — the ShowcaseMeta / Showcase types plus every getShowcase* helper — in
    // one line, exactly as the task specifies. Either quote style; optional
    // trailing /index.
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
  it('@/features/projects exports ProjectCard, ProjectFilter, and the getShowcase* helpers', async () => {
    // Non-literal specifier so vite's import-analysis defers resolution to
    // runtime (mirrors home/about-feature-module.test.ts), letting this file
    // collect and fail per-assertion rather than at transform.
    const projectsSpecifier = '@/features/projects'
    const mod = (await import(projectsSpecifier)) as Record<string, unknown>
    for (const name of RUNTIME_EXPORTS) {
      expect(
        typeof mod[name],
        `@/features/projects must export ${name} as a function`,
      ).toBe('function')
    }
  })
})
