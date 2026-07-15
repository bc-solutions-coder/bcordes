import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// Inquiries feature-module migration wiring spec (bcordes-6ow.6 / .6.1).
//
// Task 5 of the feature-based-architecture refactor relocates the two horizontal
// inquiries sources — apps/web/src/server-fns/inquiries.ts and
// apps/web/src/config/inquiries.ts — into a self-contained feature module at
// apps/web/src/features/inquiries/, exposing a public API via its own index.ts and
// repointing every consumer at the bare @/features/inquiries entry point. After the
// move:
//   * server-fns/inquiries.ts moves to features/inquiries/server-fns/inquiries.ts
//   * config/inquiries.ts     moves to features/inquiries/lib/inquiries.ts (the
//     feature's local lib; the server-fns file's internal '@/config/inquiries'
//     import becomes the relative '../lib/inquiries')
//   * features/inquiries/index.ts re-exports the seven inquiry server fns from
//     ./server-fns/inquiries AND the four status maps from ./lib/inquiries
//   * neither the old server-fns/inquiries nor @/config/inquiries deep path is
//     referenced by any source under apps/web/src (static imports AND vi.mock
//     module-path string keys), and the public API actually resolves the value
//     exports.
//
// CROSS-FEATURE BOUNDARY: components/contact/ContactForm.tsx (+ its test) also
// import submitInquiry / vi.mock the old server-fns/inquiries path. Those files belong
// to the contact feature (bcordes-6ow.7.1, which DEPENDS on this task) and are
// repointed there, not here — so the stale-path scan below excludes them by name.
//
// Mirrors the repo's structural wiring-spec convention (home/about/projects/
// shared-auth-feature-module.test.ts): resolve the repo root from this file,
// inspect the real filesystem / config, and confirm the new reality — never the
// pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as shared-auth-module.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const inquiriesFeatureDir = join(appSrc, 'features/inquiries')
const inquiriesFeatureIndex = join(inquiriesFeatureDir, 'index.ts')
const inquiriesFeatureServerFns = join(inquiriesFeatureDir, 'server-fns')
const inquiriesFeatureLib = join(inquiriesFeatureDir, 'lib')
const oldServerFnFile = join(appSrc, 'server-fns/inquiries.ts')
const oldConfigFile = join(appSrc, 'config/inquiries.ts')

// The public API surface the scout confirmed. The seven server fns re-exported
// from ./server-fns/inquiries (submitInquiry is cross-feature consumed by contact;
// fetchInquiries has no external consumer but is exported for API completeness).
const SERVER_FN_EXPORTS = [
  'submitInquiry',
  'fetchInquiries',
  'fetchMyInquiries',
  'fetchInquiry',
  'updateInquiryStatus',
  'fetchInquiryComments',
  'submitInquiryComment',
] as const

// The four status-map const exports re-exported from ./lib/inquiries. These are
// plain object maps (Record<string,string>), so they resolve as 'object' at
// runtime, not 'function'.
const LIB_EXPORTS = [
  'STATUS_TO_FRONTEND',
  'STATUS_TO_API',
  'STATUS_COLORS',
  'STATUS_LABELS',
] as const

// [exportName, sourceSubdir] — index.ts must re-export each name from that subdir.
const REEXPORTS = [
  ...SERVER_FN_EXPORTS.map((name) => [name, 'server-fns'] as const),
  ...LIB_EXPORTS.map((name) => [name, 'lib'] as const),
]

// The two stale import paths this migration must eliminate. Built by joining so
// this spec file itself is not a false positive when it scans the source tree.
const OLD_SERVER_FN_PATH = ['@/server-fns', 'inquiries'].join('/')
const OLD_CONFIG_PATH = ['@/config', 'inquiries'].join('/')

// Dashboard consumers this task owns and must repoint at @/features/inquiries.
// These route files do NOT move (only their import specifiers change), so their
// paths are stable and each must reference '@/features/inquiries' after the move.
const DASHBOARD_CONSUMERS = [
  'routes/dashboard/inquiries.index.tsx',
  'routes/dashboard/inquiries.index.test.tsx',
  'routes/dashboard/inquiries.$id.tsx',
  'routes/dashboard/inquiries.$id.test.tsx',
] as const

// Files owned by the contact feature (bcordes-6ow.7.1). Its ContactForm now
// consumes inquiries through the public @/features/inquiries barrel, so the only
// remaining referencer of the old deep path is the contact migration spec (which
// names the literal in its own guard prose/titles); exclude it from this scan.
const CONTACT_OWNED_BY_F7 = [
  join(appSrc, '__tests__/contact-feature-module.test.ts'),
]

const readIndex = (): string =>
  existsSync(inquiriesFeatureIndex)
    ? readFileSync(inquiriesFeatureIndex, 'utf8')
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

// Mock the server-fn machinery + the auth/wallow deps the relocated server-fns
// file imports, so importing features/inquiries's index resolves cleanly at
// runtime — mirrors the existing server-fns/inquiries.test.ts setup.
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
}))

describe('features/inquiries module exists with a public index', () => {
  it('has an apps/web/src/features/inquiries/ directory', () => {
    expect(existsSync(inquiriesFeatureDir)).toBe(true)
  })

  it('co-locates a server-fns/ subdirectory', () => {
    expect(existsSync(inquiriesFeatureServerFns)).toBe(true)
  })

  it('co-locates a lib/ subdirectory (the moved config module)', () => {
    expect(existsSync(inquiriesFeatureLib)).toBe(true)
  })

  it('exposes a public API at apps/web/src/features/inquiries/index.ts', () => {
    expect(existsSync(inquiriesFeatureIndex)).toBe(true)
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
        `features/inquiries/index.ts must re-export ${name} from ./${subdir}/*`,
      ).toBe(true)
    },
  )
})

describe('the horizontal inquiries source files are gone', () => {
  it('apps/web/src/server-fns/inquiries.ts no longer exists', () => {
    expect(existsSync(oldServerFnFile)).toBe(false)
  })

  it('apps/web/src/config/inquiries.ts no longer exists', () => {
    expect(existsSync(oldConfigFile)).toBe(false)
  })
})

describe('no source imports the old inquiries paths', () => {
  // Excludes this spec file and the two contact files owned by bcordes-6ow.7.1.
  const scan = (needle: string): Array<string> =>
    collectSources(appSrc)
      .filter((f) => f !== fileURLToPath(import.meta.url))
      .filter((f) => !CONTACT_OWNED_BY_F7.includes(f))
      .filter((f) => readFileSync(f, 'utf8').includes(needle))
      .map((f) => f.slice(repoRoot.length + 1))

  it('no .ts/.tsx under apps/web/src references the old server-fns/inquiries path', () => {
    const offenders = scan(OLD_SERVER_FN_PATH)
    expect(
      offenders,
      `these files still reference ${OLD_SERVER_FN_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('no .ts/.tsx under apps/web/src references @/config/inquiries', () => {
    const offenders = scan(OLD_CONFIG_PATH)
    expect(
      offenders,
      `these files still reference ${OLD_CONFIG_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

describe('every dashboard consumer resolves via the new @/features/inquiries path', () => {
  it.each(DASHBOARD_CONSUMERS)(
    '%s imports from @/features/inquiries',
    (relPath) => {
      const full = join(appSrc, relPath)
      expect(existsSync(full), `${relPath} should exist`).toBe(true)
      const contents = existsSync(full) ? readFileSync(full, 'utf8') : ''
      expect(
        contents.includes('@/features/inquiries'),
        `${relPath} must reference @/features/inquiries`,
      ).toBe(true)
    },
  )
})

describe('the public API resolves the expected exports', () => {
  it('@/features/inquiries exports the seven server fns and four status maps', async () => {
    // Non-literal specifier so vite's import-analysis defers resolution to
    // runtime (mirrors shared-auth-module.test.ts's `authSpecifier`), letting
    // this file collect and fail per-assertion rather than at transform.
    const inquiriesSpecifier = '@/features/inquiries'
    const mod = (await import(inquiriesSpecifier)) as Record<string, unknown>
    for (const name of SERVER_FN_EXPORTS) {
      expect(
        typeof mod[name],
        `@/features/inquiries must export a ${name} server fn`,
      ).toBe('function')
    }
    for (const name of LIB_EXPORTS) {
      expect(
        typeof mod[name],
        `@/features/inquiries must export the ${name} status map`,
      ).toBe('object')
    }
  })
})
