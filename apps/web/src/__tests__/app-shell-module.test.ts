import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// app/ shell-layer extraction wiring spec (bcordes-hcv.3 / .3.1).
//
// Task F3 of the flatten refactor carves the remaining app-shell / global surface
// out of the horizontal apps/web/src/components/layout/, apps/web/src/config/,
// apps/web/src/lib/, and apps/web/src/styles/ buckets into a self-contained
// app-shell module at apps/web/src/app/ (app/, since it is the leaf shell layer
// consumed BY routes, mirroring the features/* one-export-per-line index pattern),
// exposing a public API via its own index.ts and repointing every consumer at the
// bare @/app entry point (and the raw CSS asset via @/app/styles.css?url). After
// the move:
//   * components/layout/{Header,Footer,MobileNav,UserMenu}.tsx(+tests) live under
//     app/components/layout/
//   * config/navigation.ts(+test) lives under app/config/
//   * lib/web-vitals.ts lives under app/lib/
//   * styles.css lives at app/styles.css and styles/showcase.css at app/styles/
//   * app/index.ts re-exports exactly Header (./components/layout/Header),
//     Footer (./components/layout/Footer), reportWebVitals (./lib/web-vitals) —
//     the only three symbols routes/__root.tsx needs; MobileNav/UserMenu/NAV_LINKS/
//     SOCIAL_LINKS stay internal (consumed only by siblings inside app/)
//   * the old horizontal dirs (components/layout, config, lib, styles — and
//     components/ itself, now empty) and the old apps/web/src/styles.css are gone
//   * no source under apps/web/src imports the old @/components/layout,
//     @/config/navigation, @/lib/web-vitals, or @/styles.css specifiers (static
//     imports AND vi.mock module-path keys); routes/__root.tsx (+ its test) resolve
//     via @/app and @/app/styles.css; the public API resolves the three exports.
//
// Mirrors the repo's structural wiring-spec convention (shared-motion-module.test.ts,
// notifications-feature-module.test.ts): resolve the repo root from this file,
// inspect the real filesystem / config, and confirm the NEW reality — never the
// pre-migration one. Stale specifiers are built non-literally ([...].join(...)) so
// this spec's own text is never a false positive under its own or a sibling guard's
// readFileSync().includes() scan.

// apps/web/src/__tests__ -> repo root (same convention as shared-motion-module.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

const appDir = join(appSrc, 'app')
const appIndex = join(appDir, 'index.ts')

// The three symbols app/index.ts must re-export, paired with the local source path
// each is re-exported from. MobileNav/UserMenu/NAV_LINKS/SOCIAL_LINKS are internal
// only and deliberately absent from the public barrel.
const REEXPORTS = [
  ['Header', 'components/layout/Header'],
  ['Footer', 'components/layout/Footer'],
  ['reportWebVitals', 'lib/web-vitals'],
] as const

// Every file that must exist at its NEW app/ location after the move.
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
  'app/config/navigation.test.ts',
  'app/lib/web-vitals.ts',
  'app/styles.css',
  'app/styles/showcase.css',
] as const

// The horizontal dirs the move empties — components/layout (and, since it was the
// last subdir, components/ itself), config/, lib/, styles/ — all must be gone.
const OLD_DIRS = [
  'components/layout',
  'components',
  'config',
  'lib',
  'styles',
] as const

// The old raw CSS asset at the app-src root must be gone (moved to app/styles.css).
const OLD_STYLES_FILE = 'styles.css'

// The stale JS import specifiers this migration must eliminate. Built non-literally
// (mirroring the sibling guards' `[...].join(...)` convention) so this file itself
// never false-positives when scanned. Runtime values equal the literals
// '@/components/layout', '@/config/navigation', '@/lib/web-vitals', '@/styles.css'.
const OLD_SPECIFIERS = [
  ['layout components', ['@/components', 'layout'].join('/')],
  ['navigation config', ['@/config', 'navigation'].join('/')],
  ['web-vitals lib', ['@/lib', 'web-vitals'].join('/')],
  ['root styles asset', ['@/styles', 'css'].join('.')],
] as const

// Consumers whose specifiers this task repoints at the new app/ barrel. routes/
// __root.tsx imports the three named symbols from '@/app'; its test mocks '@/app'
// (the barrel), not the old deep component paths. Neither file moves.
const APP_BARREL_CONSUMERS = [
  'routes/__root.tsx',
  'routes/__root.test.tsx',
] as const

// The raw CSS asset specifier __root.tsx imports by path (non-literal so it is not
// a self-match; equals '@/app/styles.css').
const APP_STYLES_SPECIFIER = ['@/app/styles', 'css'].join('.')

const readIndex = (): string =>
  existsSync(appIndex) ? readFileSync(appIndex, 'utf8') : ''

/** All .ts/.tsx source files under apps/web/src (excludes generated route tree + self). */
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

// Mock the server-fn machinery + auth/wallow deps that app/index.ts pulls in
// transitively (Header -> @/features/notifications + @/shared/auth, both of which
// declare createServerFn chains at module scope), so importing @/app resolves
// cleanly at runtime — mirrors notifications-feature-module.test.ts.
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
    // Match `export { Name } from './<srcPath>'` (allowing extra names in the same
    // brace group and either quote style).
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
  it('@/app exports Header, Footer, reportWebVitals', async () => {
    // Non-literal specifier so vite's import-analysis defers resolution to runtime
    // (mirrors shared-motion-module.test.ts's `motionSpecifier`), letting this file
    // collect and fail per-assertion rather than at transform. The bare (non-deep)
    // @/app barrel is the sanctioned entry point.
    const appSpecifier = '@/app'
    const mod = (await import(appSpecifier)) as Record<string, unknown>
    for (const name of REEXPORTS.map(([n]) => n)) {
      expect(typeof mod[name], `@/app must export a ${name} function`).toBe(
        'function',
      )
    }
  })
})
