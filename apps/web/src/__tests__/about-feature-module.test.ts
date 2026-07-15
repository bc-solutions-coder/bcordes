import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// About feature-module migration wiring spec (bcordes-6ow.3 / .3.1).
//
// Task 2 of the feature-based-architecture refactor relocates the horizontal
// apps/web/src/components/about/* directory into a self-contained feature module
// at apps/web/src/features/about/, exposing a public API via its own index.ts and
// repointing every consumer at the bare @/features/about entry point. After the
// move: the old components/about/ directory is gone, features/about/index.ts
// re-exports the three about section components (AboutHero, Timeline, ValueIcon —
// ValueIcon is consumed inline by routes/about.tsx so it MUST be exported), no
// source under apps/web/src still imports the old @/components/about/* path
// (static imports AND vi.mock module-path mocks), and the public API actually
// resolves the three named exports.
//
// Mirrors the repo's structural wiring-spec convention (home-feature-module.test.ts,
// feature-architecture.test.ts): resolve the repo root from this file, inspect the
// real filesystem / config, and confirm the new reality — never the pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as home-feature-module.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const aboutFeatureDir = join(appSrc, 'features/about')
const aboutFeatureIndex = join(aboutFeatureDir, 'index.ts')
const oldAboutDir = join(appSrc, 'components/about')

// The three about components the scout confirmed are each NAMED exports (function
// declarations) — the module's sanctioned public API surface. ValueIcon is used
// inline as an icon prop in routes/about.tsx, so it is external-consumed and MUST
// be part of the public API (overriding the task text's 'omit if unconsumed').
const EXPECTED_EXPORTS = ['AboutHero', 'Timeline', 'ValueIcon'] as const

// The stale deep-import path this migration must eliminate. Built by joining so
// this spec file itself is not a false positive when it scans the source tree.
const OLD_ABOUT_PATH = ['@/components', 'about'].join('/')

const readIndex = (): string =>
  existsSync(aboutFeatureIndex) ? readFileSync(aboutFeatureIndex, 'utf8') : ''

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

describe('features/about module exists with a public index', () => {
  it('has an apps/web/src/features/about/ directory', () => {
    expect(existsSync(aboutFeatureDir)).toBe(true)
  })

  it('exposes a public API at apps/web/src/features/about/index.ts', () => {
    expect(existsSync(aboutFeatureIndex)).toBe(true)
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
        `features/about/index.ts must re-export ${name} from ./components/*`,
      ).toBe(true)
    },
  )
})

describe('the horizontal components/about directory is gone', () => {
  it('apps/web/src/components/about/ no longer exists', () => {
    expect(existsSync(oldAboutDir)).toBe(false)
  })
})

describe('no source imports the old @/components/about path', () => {
  it('no .ts/.tsx under apps/web/src references @/components/about', () => {
    const offenders = collectSources(appSrc)
      .filter((f) => f !== fileURLToPath(import.meta.url))
      .filter((f) => readFileSync(f, 'utf8').includes(OLD_ABOUT_PATH))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still reference ${OLD_ABOUT_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

describe('the public API resolves the three named exports', () => {
  it('@/features/about exports AboutHero, Timeline, ValueIcon', async () => {
    // Non-literal specifier so vite's import-analysis defers resolution to
    // runtime (mirrors home-feature-module.test.ts's `homeSpecifier`), letting
    // this file collect and fail per-assertion rather than at transform.
    const aboutSpecifier = '@/features/about'
    const mod = (await import(aboutSpecifier)) as Record<string, unknown>
    for (const name of EXPECTED_EXPORTS) {
      expect(
        typeof mod[name],
        `@/features/about must export a ${name} component`,
      ).toBe('function')
    }
  })
})
