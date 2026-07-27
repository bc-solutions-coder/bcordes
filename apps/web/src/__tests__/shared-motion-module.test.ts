import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// shared/motion module migration wiring spec (bcordes-hcv.2 / .2.1).
//
// Task F2 of the flatten refactor carves the cross-cutting motion primitives out
// of the horizontal apps/web/src/hooks/ + apps/web/src/components/shared/ buckets
// into a self-contained CROSS-CUTTING module at apps/web/src/shared/motion/
// (shared/, not features/, since motion is glue not a product feature), exposing a
// public API via its own index.ts and repointing every consumer at the bare
// @/shared/motion entry point. After the move: the old hooks/useReducedMotion.ts +
// hooks/useScrollAnimation.ts + components/shared/FadeInView.tsx files are gone,
// shared/motion/index.ts re-exports the hooks (useReducedMotion, useScrollAnimation)
// from ./hooks/* and the component (FadeInView) from ./components/*, no source under
// apps/web/src still imports the old @/hooks/useReducedMotion, @/hooks/useScrollAnimation
// or @/components/shared/FadeInView paths (static imports AND vi.mock module-path
// mocks), and the public API actually resolves the three named exports.
//
// Mirrors the repo's structural wiring-spec convention (shared-auth-module.test.ts,
// home-feature-module.test.ts): resolve the repo root from this file, inspect the
// real filesystem / config, and confirm the new reality — never the pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as shared-auth-module.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const motionModuleDir = join(appSrc, 'shared/motion')
const motionModuleIndex = join(motionModuleDir, 'index.ts')
const oldUseReducedMotionFile = join(appSrc, 'hooks/useReducedMotion.ts')
const oldUseScrollAnimationFile = join(appSrc, 'hooks/useScrollAnimation.ts')
const oldFadeInViewFile = join(appSrc, 'components/shared/FadeInView.tsx')

// The public API surface the scout confirmed consumers actually use, grouped by
// which relocated source file each name is re-exported from. The two hooks land
// under shared/motion/hooks/*; FadeInView lands under shared/motion/components/*.
const HOOK_EXPORTS = ['useReducedMotion', 'useScrollAnimation'] as const
const COMPONENT_EXPORTS = ['FadeInView'] as const
const EXPECTED_EXPORTS = [...HOOK_EXPORTS, ...COMPONENT_EXPORTS] as const

// [exportName, sourceSubdir] — index.ts must re-export each name from that subdir.
const REEXPORTS = [
  ...HOOK_EXPORTS.map((name) => [name, 'hooks'] as const),
  ...COMPONENT_EXPORTS.map((name) => [name, 'components'] as const),
]

// The stale import paths this migration must eliminate. Built by joining so this
// spec file itself is not a false positive when it scans the source tree.
const OLD_USE_REDUCED_MOTION_PATH = ['@/hooks', 'useReducedMotion'].join('/')
const OLD_USE_SCROLL_ANIMATION_PATH = ['@/hooks', 'useScrollAnimation'].join(
  '/',
)
const OLD_FADE_IN_VIEW_PATH = ['@/components/shared', 'FadeInView'].join('/')

// [label, staleSpecifier] pairs driving the no-stale-import scan below.
const OLD_PATHS = [
  ['useReducedMotion hook', OLD_USE_REDUCED_MOTION_PATH],
  ['useScrollAnimation hook', OLD_USE_SCROLL_ANIMATION_PATH],
  ['FadeInView component', OLD_FADE_IN_VIEW_PATH],
] as const

const readIndex = (): string =>
  existsSync(motionModuleIndex) ? readFileSync(motionModuleIndex, 'utf8') : ''

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

describe('shared/motion module exists with a public index', () => {
  it('has an apps/web/src/shared/motion/ directory', () => {
    expect(existsSync(motionModuleDir)).toBe(true)
  })

  it('exposes a public API at apps/web/src/shared/motion/index.ts', () => {
    expect(existsSync(motionModuleIndex)).toBe(true)
  })

  it.each(REEXPORTS)(
    'index.ts re-exports %s from its local ./%s/',
    (name, subdir) => {
      const src = readIndex()
      // Match `export { Name } from './<subdir>/...'` (allowing extra names in
      // the same brace group and either quote style).
      const pattern = new RegExp(
        `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]\\./${subdir}/`,
      )
      expect(
        pattern.test(src),
        `shared/motion/index.ts must re-export ${name} from ./${subdir}/*`,
      ).toBe(true)
    },
  )
})

describe('the horizontal motion source files are gone', () => {
  it('apps/web/src/hooks/useReducedMotion.ts no longer exists', () => {
    expect(existsSync(oldUseReducedMotionFile)).toBe(false)
  })

  it('apps/web/src/hooks/useScrollAnimation.ts no longer exists', () => {
    expect(existsSync(oldUseScrollAnimationFile)).toBe(false)
  })

  it('apps/web/src/components/shared/FadeInView.tsx no longer exists', () => {
    expect(existsSync(oldFadeInViewFile)).toBe(false)
  })
})

describe('no source imports the old motion paths', () => {
  it.each(OLD_PATHS)(
    'no .ts/.tsx under apps/web/src references the old %s path',
    (_label, stalePath) => {
      const offenders = collectSources(appSrc)
        .filter((f) => f !== fileURLToPath(import.meta.url))
        .filter((f) => readFileSync(f, 'utf8').includes(stalePath))
        .map((f) => f.slice(repoRoot.length + 1))
      expect(
        offenders,
        `these files still reference ${stalePath}: ${offenders.join(', ')}`,
      ).toEqual([])
    },
  )
})

describe('the public API resolves the expected named exports', () => {
  it('@/shared/motion exports useReducedMotion, useScrollAnimation, FadeInView', async () => {
    // Non-literal specifier so vite's import-analysis defers resolution to
    // runtime (mirrors shared-auth-module.test.ts's `authSpecifier`), letting
    // this file collect and fail per-assertion rather than at transform. The
    // bare (non-deep) @/shared/motion barrel is the sanctioned entry point.
    const motionSpecifier = '@/shared/motion'
    const mod = (await import(motionSpecifier)) as Record<string, unknown>
    for (const name of EXPECTED_EXPORTS) {
      expect(
        typeof mod[name],
        `@/shared/motion must export a ${name} function`,
      ).toBe('function')
    }
  })
})
