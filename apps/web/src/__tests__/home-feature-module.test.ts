import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const homeFeatureDir = join(appSrc, 'features/home')
const homeFeatureIndex = join(homeFeatureDir, 'index.ts')
const oldHomeDir = join(appSrc, 'components/home')

const EXPECTED_EXPORTS = [
  'Hero',
  'FeaturedWork',
  'ServicesGrid',
  'SkillsShowcase',
] as const

// Keep paths split to avoid matching this test in sibling source scans.
const OLD_HOME_PATH = ['@/components', 'home'].join('/')

const readIndex = (): string =>
  existsSync(homeFeatureIndex) ? readFileSync(homeFeatureIndex, 'utf8') : ''

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
      // Allow grouped exports and either quote style.
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
    // Keep the specifier nonliteral so missing exports fail at runtime, not during Vite transformation.
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
