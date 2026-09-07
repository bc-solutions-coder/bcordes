import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as motion from '@/shared/motion'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const motionModuleDir = join(appSrc, 'shared/motion')
const motionModuleIndex = join(motionModuleDir, 'index.ts')
const oldUseReducedMotionFile = join(appSrc, 'hooks/useReducedMotion.ts')
const oldUseScrollAnimationFile = join(appSrc, 'hooks/useScrollAnimation.ts')
const oldFadeInViewFile = join(appSrc, 'components/shared/FadeInView.tsx')

const HOOK_EXPORTS = ['useReducedMotion', 'useScrollAnimation'] as const
const COMPONENT_EXPORTS = ['FadeInView'] as const
const EXPECTED_EXPORTS = [...HOOK_EXPORTS, ...COMPONENT_EXPORTS] as const

const REEXPORTS = [
  ...HOOK_EXPORTS.map((name) => [name, 'hooks'] as const),
  ...COMPONENT_EXPORTS.map((name) => [name, 'components'] as const),
]

// Keep paths split to avoid matching this test in sibling source scans.
const OLD_USE_REDUCED_MOTION_PATH = ['@/hooks', 'useReducedMotion'].join('/')
const OLD_USE_SCROLL_ANIMATION_PATH = ['@/hooks', 'useScrollAnimation'].join(
  '/',
)
const OLD_FADE_IN_VIEW_PATH = ['@/components/shared', 'FadeInView'].join('/')

const OLD_PATHS = [
  ['useReducedMotion hook', OLD_USE_REDUCED_MOTION_PATH],
  ['useScrollAnimation hook', OLD_USE_SCROLL_ANIMATION_PATH],
  ['FadeInView component', OLD_FADE_IN_VIEW_PATH],
] as const

const readIndex = (): string =>
  existsSync(motionModuleIndex) ? readFileSync(motionModuleIndex, 'utf8') : ''

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
      // Allow grouped exports and either quote style.
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
  it('@/shared/motion exports useReducedMotion, useScrollAnimation, FadeInView', () => {
    for (const name of EXPECTED_EXPORTS) {
      expect(
        typeof motion[name],
        `@/shared/motion must export a ${name} function`,
      ).toBe('function')
    }
  })
})
