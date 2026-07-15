import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Home feature-module migration wiring spec (bcordes-6ow.2 / .2.1).
//
// Task 1 of the feature-based-architecture refactor relocates the horizontal
// apps/web/src/components/home/* directory into a self-contained feature module
// at apps/web/src/features/home/, exposing a public API via its own index.ts and
// repointing every consumer at the bare @/features/home entry point. After the
// move: the old components/home/ directory is gone, features/home/index.ts
// re-exports the four home section components (Hero, FeaturedWork, ServicesGrid,
// SkillsShowcase), no source under apps/web/src still imports the old
// @/components/home/* path (static imports AND vi.mock module-path mocks), and
// the public API actually resolves the four named exports.
//
// Mirrors the repo's structural wiring-spec convention (feature-architecture.test.ts,
// docs-workspace-layout.test.ts): resolve the repo root from this file, inspect the
// real filesystem / config, and confirm the new reality — never the pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as feature-architecture.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const homeFeatureDir = join(appSrc, 'features/home')
const homeFeatureIndex = join(homeFeatureDir, 'index.ts')
const oldHomeDir = join(appSrc, 'components/home')

// The four home section components the scout confirmed are each NAMED exports
// (function declarations) — the module's sanctioned public API surface.
const EXPECTED_EXPORTS = [
  'Hero',
  'FeaturedWork',
  'ServicesGrid',
  'SkillsShowcase',
] as const

// The stale deep-import path this migration must eliminate. Built by joining so
// this spec file itself is not a false positive when it scans the source tree.
const OLD_HOME_PATH = ['@/components', 'home'].join('/')

const readIndex = (): string =>
  existsSync(homeFeatureIndex) ? readFileSync(homeFeatureIndex, 'utf8') : ''

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

describe('features/home module exists with a public index', () => {
  it('has an apps/web/src/features/home/ directory', () => {
    expect(existsSync(homeFeatureDir)).toBe(true)
  })

  it('exposes a public API at apps/web/src/features/home/index.ts', () => {
    expect(existsSync(homeFeatureIndex)).toBe(true)
  })

  it.each(EXPECTED_EXPORTS)(
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
        `features/home/index.ts must re-export ${name} from ./components/*`,
      ).toBe(true)
    },
  )
})

describe('the horizontal components/home directory is gone', () => {
  it('apps/web/src/components/home/ no longer exists', () => {
    expect(existsSync(oldHomeDir)).toBe(false)
  })
})

describe('no source imports the old @/components/home path', () => {
  it('no .ts/.tsx under apps/web/src references @/components/home', () => {
    const offenders = collectSources(appSrc)
      .filter((f) => f !== fileURLToPath(import.meta.url))
      .filter((f) => readFileSync(f, 'utf8').includes(OLD_HOME_PATH))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still reference ${OLD_HOME_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

describe('the public API resolves the four named exports', () => {
  it('@/features/home exports Hero, FeaturedWork, ServicesGrid, SkillsShowcase', async () => {
    // Non-literal specifier so vite's import-analysis defers resolution to
    // runtime (mirrors feature-architecture.test.ts's `eslintSpecifier`),
    // letting this file collect and fail per-assertion rather than at transform.
    const homeSpecifier = '@/features/home'
    const mod = (await import(homeSpecifier)) as Record<string, unknown>
    for (const name of EXPECTED_EXPORTS) {
      expect(
        typeof mod[name],
        `@/features/home must export a ${name} component`,
      ).toBe('function')
    }
  })
})
