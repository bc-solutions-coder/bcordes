import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const authModuleDir = join(appSrc, 'shared/auth')
const authModuleIndex = join(authModuleDir, 'index.ts')
const oldUseUserFile = join(appSrc, 'hooks/useUser.ts')
const oldAuthServerFnFile = join(appSrc, 'server-fns/auth.ts')

const HOOK_EXPORTS = ['useUser', 'useRequireUser'] as const
const SERVER_FN_EXPORTS = [
  'serverRequireAuth',
  'fetchCurrentUserRoles',
] as const
const EXPECTED_EXPORTS = [...HOOK_EXPORTS, ...SERVER_FN_EXPORTS] as const

const REEXPORTS = [
  ...HOOK_EXPORTS.map((name) => [name, 'hooks'] as const),
  ...SERVER_FN_EXPORTS.map((name) => [name, 'server-fns'] as const),
]

// Keep paths split to avoid matching this test in sibling source scans.
const OLD_USEUSER_PATH = ['@/hooks', 'useUser'].join('/')
const OLD_AUTH_SERVER_FN_PATH = ['@/server-fns', 'auth'].join('/')

const readIndex = (): string =>
  existsSync(authModuleIndex) ? readFileSync(authModuleIndex, 'utf8') : ''

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
        callable.handler = handlerFn
        callable.inputValidator = () => chain
        return callable
      },
    }
    return chain
  }
  return { createServerFn }
})

vi.mock('@bcordes/auth/middleware', () => ({
  getAuthUser: vi.fn(),
  requireAuth: vi.fn(),
}))

describe('shared/auth module exists with a public index', () => {
  it('has an apps/web/src/shared/auth/ directory', () => {
    expect(existsSync(authModuleDir)).toBe(true)
  })

  it('exposes a public API at apps/web/src/shared/auth/index.ts', () => {
    expect(existsSync(authModuleIndex)).toBe(true)
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
        `shared/auth/index.ts must re-export ${name} from ./${subdir}/*`,
      ).toBe(true)
    },
  )
})

describe('the horizontal auth source files are gone', () => {
  it('apps/web/src/hooks/useUser.ts no longer exists', () => {
    expect(existsSync(oldUseUserFile)).toBe(false)
  })

  it('apps/web/src/server-fns/auth.ts no longer exists', () => {
    expect(existsSync(oldAuthServerFnFile)).toBe(false)
  })
})

describe('no source imports the old auth paths', () => {
  it('no .ts/.tsx under apps/web/src references @/hooks/useUser', () => {
    const offenders = collectSources(appSrc)
      .filter((f) => f !== fileURLToPath(import.meta.url))
      .filter((f) => readFileSync(f, 'utf8').includes(OLD_USEUSER_PATH))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still reference ${OLD_USEUSER_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('no .ts/.tsx under apps/web/src references @/server-fns/auth', () => {
    const offenders = collectSources(appSrc)
      .filter((f) => f !== fileURLToPath(import.meta.url))
      .filter((f) => readFileSync(f, 'utf8').includes(OLD_AUTH_SERVER_FN_PATH))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still reference ${OLD_AUTH_SERVER_FN_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

describe('the public API resolves the expected named exports', () => {
  it('@/shared/auth exports useUser, useRequireUser, serverRequireAuth, fetchCurrentUserRoles', async () => {
    // Keep the specifier nonliteral so missing exports fail at runtime, not during Vite transformation.
    const authSpecifier = '@/shared/auth'
    const mod = (await import(authSpecifier)) as Record<string, unknown>
    for (const name of EXPECTED_EXPORTS) {
      expect(
        typeof mod[name],
        `@/shared/auth must export a ${name} function`,
      ).toBe('function')
    }
  })
})
