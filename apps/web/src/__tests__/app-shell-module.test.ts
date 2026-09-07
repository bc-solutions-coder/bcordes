import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import * as app from '@/app'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

const appDir = join(appSrc, 'app')
const appIndex = join(appDir, 'index.ts')

// MobileNav, UserMenu and navigation constants stay internal to app/.
const REEXPORTS = [
  ['Header', 'components/layout/Header'],
  ['Footer', 'components/layout/Footer'],
  ['reportWebVitals', 'lib/web-vitals'],
] as const

const NEW_FILES = [
  'app/index.ts',
  'app/components/layout/Header.tsx',
  'app/components/layout/Header.test.tsx',
  'app/components/layout/Footer.tsx',
  'app/components/layout/Footer.test.tsx',
  'app/components/layout/MobileNav.tsx',
  'app/components/layout/MobileNav.test.tsx',
  'app/components/layout/UserMenu.tsx',
  'app/components/layout/UserMenu.test.tsx',
  'app/config/navigation.ts',
  'app/lib/web-vitals.ts',
  'app/styles.css',
  'app/styles/showcase.css',
] as const

const OLD_DIRS = [
  'components/layout',
  'components',
  'config',
  'lib',
  'styles',
] as const

const OLD_STYLES_FILE = 'styles.css'

// Keep paths split to avoid matching this test in sibling source scans.
const OLD_SPECIFIERS = [
  ['layout components', ['@/components', 'layout'].join('/')],
  ['navigation config', ['@/config', 'navigation'].join('/')],
  ['web-vitals lib', ['@/lib', 'web-vitals'].join('/')],
  ['root styles asset', ['@/styles', 'css'].join('.')],
] as const

const APP_BARREL_CONSUMERS = ['routes/__root.tsx'] as const

const APP_STYLES_SPECIFIER = ['@/app/styles', 'css'].join('.')

const readIndex = (): string =>
  existsSync(appIndex) ? readFileSync(appIndex, 'utf8') : ''

function collectSources(dir: string, acc: Array<string> = []): Array<string> {
  for (const entry of readdirSync(dir)) {
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

// Mock server dependencies so the public module can load without a server runtime.
vi.mock('@tanstack/react-start', () => {
  const createServerFn = () => {
    let handlerFn: (...args: Array<unknown>) => unknown
    const chain = {
      inputValidator: () => chain,
      handler: (fn: (...args: Array<unknown>) => unknown) => {
        handlerFn = fn
        const callable = (...args: Array<unknown>) => handlerFn(...args)
        Object.assign(callable, chain)
        return callable
      },
    }
    return chain
  }
  return { createServerFn }
})

vi.mock('@bcordes/wallow/client', () => ({
  createWallowClient: vi.fn(),
}))

vi.mock('@bcordes/wallow/service-client', () => ({
  serviceClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    head: vi.fn(),
  },
}))

vi.mock('@bcordes/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@bcordes/auth/middleware', () => ({
  requireAdmin: vi.fn(),
  requireAuth: vi.fn(),
  getAuthUser: vi.fn(),
}))

describe('app/ shell module exists with a public index', () => {
  it('has an apps/web/src/app/ directory', () => {
    expect(existsSync(appDir)).toBe(true)
  })

  it('exposes a public API at apps/web/src/app/index.ts', () => {
    expect(existsSync(appIndex)).toBe(true)
  })

  it.each(REEXPORTS)('index.ts re-exports %s from ./%s', (name, srcPath) => {
    const src = readIndex()
    // Allow grouped exports and either quote style.
    const pattern = new RegExp(
      `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]\\./${srcPath}['"]`,
    )
    expect(
      pattern.test(src),
      `app/index.ts must re-export ${name} from ./${srcPath}`,
    ).toBe(true)
  })
})

describe('the app-shell files live at their new app/ locations', () => {
  it.each(NEW_FILES)('apps/web/src/%s exists', (relPath) => {
    expect(existsSync(join(appSrc, relPath))).toBe(true)
  })
})

describe('the old horizontal app-shell locations are gone', () => {
  it.each(OLD_DIRS)('apps/web/src/%s/ no longer exists', (relDir) => {
    expect(existsSync(join(appSrc, relDir))).toBe(false)
  })

  it('apps/web/src/styles.css (root asset) no longer exists', () => {
    expect(existsSync(join(appSrc, OLD_STYLES_FILE))).toBe(false)
  })
})

describe('no source imports the old app-shell specifiers', () => {
  it.each(OLD_SPECIFIERS)(
    'no .ts/.tsx under apps/web/src references the old %s specifier',
    (_label, stalePath) => {
      const offenders = collectSources(appSrc)
        .filter((f) => readFileSync(f, 'utf8').includes(stalePath))
        .map((f) => f.slice(repoRoot.length + 1))
      expect(
        offenders,
        `these files still reference ${stalePath}: ${offenders.join(', ')}`,
      ).toEqual([])
    },
  )
})

describe('every app-shell consumer resolves via the new @/app path', () => {
  it.each(APP_BARREL_CONSUMERS)('%s references @/app', (relPath) => {
    const full = join(appSrc, relPath)
    expect(existsSync(full), `${relPath} should exist`).toBe(true)
    const contents = existsSync(full) ? readFileSync(full, 'utf8') : ''
    expect(
      contents.includes('@/app'),
      `${relPath} must reference the @/app barrel`,
    ).toBe(true)
  })

  it('routes/__root.tsx imports the styles asset via @/app/styles.css', () => {
    const full = join(appSrc, 'routes/__root.tsx')
    const contents = existsSync(full) ? readFileSync(full, 'utf8') : ''
    expect(
      contents.includes(APP_STYLES_SPECIFIER),
      'routes/__root.tsx must import appCss from @/app/styles.css?url',
    ).toBe(true)
  })
})

describe('the public API resolves the expected named exports', () => {
  it('@/app exports Header, Footer, reportWebVitals', () => {
    for (const name of REEXPORTS.map(([n]) => n)) {
      expect(typeof app[name], `@/app must export a ${name} function`).toBe(
        'function',
      )
    }
  })
})
