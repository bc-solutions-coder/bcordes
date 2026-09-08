import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import * as inquiries from '@/features/inquiries'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const inquiriesFeatureDir = join(appSrc, 'features/inquiries')
const inquiriesFeatureIndex = join(inquiriesFeatureDir, 'index.ts')
const inquiriesFeatureServerFns = join(inquiriesFeatureDir, 'server-fns')
const inquiriesFeatureLib = join(inquiriesFeatureDir, 'lib')
const oldServerFnFile = join(appSrc, 'server-fns/inquiries.ts')
const oldConfigFile = join(appSrc, 'config/inquiries.ts')

const SERVER_FN_EXPORTS = [
  'submitInquiry',
  'fetchInquiries',
  'fetchMyInquiries',
  'fetchInquiry',
  'updateInquiryStatus',
  'fetchInquiryComments',
  'submitInquiryComment',
] as const

const LIB_EXPORTS = [
  'STATUS_TO_FRONTEND',
  'STATUS_TO_API',
  'STATUS_COLORS',
  'STATUS_LABELS',
] as const

const REEXPORTS = [
  ...SERVER_FN_EXPORTS.map((name) => [name, 'server-fns'] as const),
  ...LIB_EXPORTS.map((name) => [name, 'lib'] as const),
]

// Keep paths split to avoid matching this test in sibling source scans.
const OLD_SERVER_FN_PATH = ['@/server-fns', 'inquiries'].join('/')
const OLD_CONFIG_PATH = ['@/config', 'inquiries'].join('/')

const DASHBOARD_CONSUMERS = [
  'routes/dashboard/inquiries.index.tsx',
  'routes/dashboard/inquiries.$id.tsx',
] as const

// The contact module test names the old path in test titles, so exclude it from this scan.
const CONTACT_OWNED_BY_F7 = [
  join(appSrc, '__tests__/contact-feature-module.test.ts'),
]

const readIndex = (): string =>
  existsSync(inquiriesFeatureIndex)
    ? readFileSync(inquiriesFeatureIndex, 'utf8')
    : ''

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
      // Allow grouped exports and either quote style.
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
  it('@/features/inquiries exports the seven server fns and four status maps', () => {
    for (const name of SERVER_FN_EXPORTS) {
      expect(
        typeof inquiries[name],
        `@/features/inquiries must export a ${name} server fn`,
      ).toBe('function')
    }
    for (const name of LIB_EXPORTS) {
      expect(
        typeof inquiries[name],
        `@/features/inquiries must export the ${name} status map`,
      ).toBe('object')
    }
  })
})
