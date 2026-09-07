import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const aboutFeatureDir = join(appSrc, 'features/about')
const aboutFeatureIndex = join(aboutFeatureDir, 'index.ts')
const oldAboutDir = join(appSrc, 'components/about')

// ValueIcon is part of the public API because the about route passes it as an icon prop.
const EXPECTED_EXPORTS = ['AboutHero', 'Timeline', 'ValueIcon'] as const

// Keep paths split to avoid matching this test in sibling source scans.
const OLD_ABOUT_PATH = ['@/components', 'about'].join('/')

const readIndex = (): string =>
  existsSync(aboutFeatureIndex) ? readFileSync(aboutFeatureIndex, 'utf8') : ''

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
      // Allow grouped exports and either quote style.
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
    // Keep the specifier nonliteral so missing exports fail at runtime, not during Vite transformation.
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
