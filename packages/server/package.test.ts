import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// These specs verify that @bcordes/server is a real, wired-up workspace package
// rather than a directory that happens to hold some files: the CSRF server
// function plus the CSRF-validation and security-headers h3 middlewares moved
// out of apps/web, pnpm links the package, apps/web resolves the package's
// subpath exports, every app-local import path was retired, h3 is a real
// declared dependency (not a NODE_PATH-hoist accident), and the package's own
// tests run inside the root vitest.
//
// The package mirrors the old file layout as subpath exports (./csrf,
// ./csrf-validation, ./security-headers) so the move is mechanical. The two
// middleware symbols (validateCsrfToken, applySecurityHeaders) form the '.' barrel;
// the createServerFn getCsrfToken deliberately does NOT — it stays on its own
// ./csrf subpath so the createServerFn transform surface stays isolated (see
// the "risk seam" block).
//
// DEAD-CODE REALITY (verified by scout + re-verified here): csrf-validation.ts
// and security-headers.ts have ZERO non-test consumers in apps/web today (they
// are not wired into start.ts's requestMiddleware), and getCsrfToken has no
// caller either. So — unlike @bcordes/auth — there is NO app-side importer
// floor. The package's "consumers" are its own moved-in tests, and the
// "consumers can import from @bcordes/server" criterion is proved by resolving
// the subpaths from apps/web (which declares the workspace dep). Wiring the
// middlewares into the real request pipeline is a separate pre-existing-bug
// fix, out of scope for this pure extraction.

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

/**
 * Tracked + untracked (but not gitignored) files under `scope` matching
 * `pattern`. git grep exits 1 when nothing matches, which is a valid answer
 * here, not an error.
 *
 * This file is excluded from its own search: it quotes the very import paths it
 * forbids, so without the exclusion it would always report itself as the sole
 * violator and be unsatisfiable by any implementation.
 */
const filesMatching = (
  pattern: string,
  scope: Array<string> = ['apps', 'packages'],
): Array<string> => {
  try {
    return execFileSync(
      'git',
      [
        'grep',
        '-l',
        '--untracked',
        '-e',
        pattern,
        '--',
        ...scope,
        ':!packages/server/package.test.ts',
      ],
      { cwd: repoRoot, encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean)
      .sort()
  } catch {
    return []
  }
}

/**
 * Probe module resolution from apps/web in a child process with NODE_PATH
 * cleared — the pnpm bin shim sets NODE_PATH to the hidden hoist dir
 * (node_modules/.pnpm/node_modules), which lets an *undeclared* package resolve
 * at runtime under `pnpm vitest`. tsc and Vite ignore NODE_PATH, so an
 * in-process check would pass while a real "undeclared dependency" defect
 * stands. (Mirrors apps/web/src/__tests__/h3-resolution.test.ts.)
 */
const resolveFromWebWithoutNodePath = (specifier: string): string =>
  execFileSync(
    process.execPath,
    [
      '-e',
      `const { createRequire } = require('node:module')
       process.stdout.write(
         createRequire(process.argv[1]).resolve(process.argv[2]),
       )`,
      join(webDir, 'package.json'),
      specifier,
    ],
    { env: { ...process.env, NODE_PATH: '' }, encoding: 'utf8' },
  )

/** The three modules that move out of apps/web into packages/server/src. */
const SOURCE_MODULES = ['csrf', 'csrf-validation', 'security-headers'] as const

describe('@bcordes/server package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/server')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('maps the old file layout to subpath exports (no build step, no dist/)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './csrf': './src/csrf.ts',
      './csrf-validation': './src/csrf-validation.ts',
      './security-headers': './src/security-headers.ts',
    })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('owns h3 as a real runtime dependency (not a NODE_PATH hoist accident)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // csrf-validation.ts and security-headers.ts import h3 directly. A package
    // declares what it imports rather than leaning on the workspace's hidden
    // hoist dir — the same class of bug guarded for apps/web by
    // h3-resolution.test.ts (bcordes-0i2.1.3), one level down.
    expect(manifest.dependencies).toHaveProperty('h3')
  })

  it('depends on the already-extracted @bcordes/auth package', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // csrf.ts and csrf-validation.ts read the sealed session via
    // @bcordes/auth/session (and SessionData via @bcordes/auth/types).
    expect(manifest.dependencies['@bcordes/auth']).toBe('workspace:*')
  })

  it('keeps the TanStack framework surface as a peer dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // csrf.ts builds its server function with createServerFn from
    // @tanstack/react-start; that is the host app's singleton, so it is a peer,
    // not a bundled dep.
    expect(manifest.peerDependencies).toMatchObject({
      '@tanstack/react-start': expect.any(String),
    })
  })
})

describe('the middleware really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/server/middleware', () => {
    // The whole middleware directory moves; a leftover copy would keep
    // @/server/middleware/* resolving and hide a half-done extraction.
    expect(existsSync(join(webDir, 'src/server/middleware'))).toBe(false)
    // ...and once its only contents are gone, the empty parent goes too.
    expect(existsSync(join(webDir, 'src/server'))).toBe(false)
  })

  it('moves csrf.ts out of apps/web/src/server-fns (product server-fns stay)', () => {
    // Only csrf.ts leaves server-fns; auth.ts is product domain and stays in
    // apps/web permanently. inquiries.ts and notifications.ts each relocated
    // into their own feature module (apps/web/src/features/*/server-fns/).
    expect(existsSync(join(webDir, 'src/server-fns/csrf.ts'))).toBe(false)
    expect(existsSync(join(webDir, 'src/server-fns/csrf.test.ts'))).toBe(false)
    expect(
      existsSync(
        join(webDir, 'src/features/inquiries/server-fns/inquiries.ts'),
      ),
    ).toBe(true)
    expect(existsSync(join(webDir, 'src/server-fns/notifications.ts'))).toBe(
      false,
    )
    expect(
      existsSync(
        join(webDir, 'src/features/notifications/server-fns/notifications.ts'),
      ),
    ).toBe(true)
  })

  it('carries every source module into packages/server/src', () => {
    for (const mod of SOURCE_MODULES) {
      expect(existsSync(join(packageDir, `src/${mod}.ts`))).toBe(true)
    }
  })

  it('brings the behaviour tests along with their modules', () => {
    // The unit tests move next to the code; the two cross-cutting app-level
    // tests (security-headers, csrf-token) move into the package's src too.
    for (const testFile of [
      'src/csrf.test.ts',
      'src/csrf-validation.test.ts',
      'src/security-headers.test.ts',
      'src/csrf-token.test.ts',
    ]) {
      expect(existsSync(join(packageDir, testFile))).toBe(true)
    }
    // ...and their old homes are gone.
    expect(
      existsSync(join(webDir, 'src/__tests__/security-headers.test.ts')),
    ).toBe(false)
    expect(existsSync(join(webDir, 'src/__tests__/csrf-token.test.ts'))).toBe(
      false,
    )
  })
})

describe("the '.' barrel exposes the two middleware symbols", () => {
  it('exports exactly applySecurityHeaders and validateCsrfToken', async () => {
    const mod = await import('./src/index')

    // Exact, not a superset. The server-fn getCsrfToken is deliberately absent
    // (it lives on ./csrf only), so the createServerFn transform surface stays
    // isolated to one subpath and never enters the barrel's eval graph.
    expect(Object.keys(mod).sort()).toEqual([
      'applySecurityHeaders',
      'validateCsrfToken',
    ])
    expect(Object.keys(mod)).not.toContain('getCsrfToken')
  })

  it('hands back h3 event handlers', async () => {
    const { validateCsrfToken, applySecurityHeaders } =
      (await import('./src/index')) as {
        validateCsrfToken: () => unknown
        applySecurityHeaders: unknown
      }

    expect(typeof validateCsrfToken).toBe('function')
    expect(typeof validateCsrfToken()).toBe('function')
    expect(typeof applySecurityHeaders).toBe('function')
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of apps/web', () => {
    // apps/web declares the package so its @bcordes/server/* subpaths resolve
    // app-side — the concrete home for a future start.ts wiring of the
    // middlewares, and what makes "consumers can import from @bcordes/server"
    // satisfiable from the app.
    const web = readJson(join(webDir, 'package.json'))

    expect(web.dependencies['@bcordes/server']).toBe('workspace:*')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/server')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it('resolves its subpath exports from apps/web', () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(
      realpathSync(requireFromWeb.resolve('@bcordes/server/security-headers')),
    ).toBe(realpathSync(join(packageDir, 'src/security-headers.ts')))
    expect(
      realpathSync(requireFromWeb.resolve('@bcordes/server/csrf-validation')),
    ).toBe(realpathSync(join(packageDir, 'src/csrf-validation.ts')))
    expect(realpathSync(requireFromWeb.resolve('@bcordes/server/csrf'))).toBe(
      realpathSync(join(packageDir, 'src/csrf.ts')),
    )
  })
})

describe('h3 resolves as a real dependency of packages/server', () => {
  it('installs h3 into the package resolution graph', () => {
    // With h3 declared, pnpm links it so a plain Node resolve from apps/web (or
    // the package) finds it. The v2 API (defineEventHandler/setHeaders/
    // getRequestHeader) is what the middleware imports.
    expect(() => resolveFromWebWithoutNodePath('h3/package.json')).not.toThrow()
    const pkg = readJson(resolveFromWebWithoutNodePath('h3/package.json')) as {
      version: string
    }
    expect(pkg.version).toMatch(/^2\./)
  })
})

describe('every former importer was retired', () => {
  it('leaves no @/server/middleware import anywhere', () => {
    // The whole app-local middleware path is gone; the moved unit tests import
    // their siblings relatively inside the package.
    expect(filesMatching('@/server/middleware/')).toEqual([])
  })

  it('leaves no @/server-fns/csrf import anywhere', () => {
    // Only the csrf server-fn path retires; the surviving product server-fns
    // (auth/inquiries/notifications) keep their @/server-fns/* paths, so this is
    // scoped to csrf specifically.
    expect(filesMatching('@/server-fns/csrf')).toEqual([])
  })
})

describe('the package runs in the root vitest', () => {
  it(
    "collects the package's own tests as its own project",
    { timeout: 120_000 },
    () => {
      // packages/* in the root vitest projects glob is only worth anything if a
      // new package is picked up with no root-side edit at all. This also proves
      // the moved CSRF/security-headers tests run inside the package.
      const collected: Array<{ file: string; projectName: string }> =
        JSON.parse(
          execFileSync(
            'pnpm',
            [
              'exec',
              'vitest',
              'list',
              '--json',
              '--project',
              '@bcordes/server',
            ],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual([
        join(packageDir, 'package.test.ts'),
        join(packageDir, 'src/csrf-token.test.ts'),
        join(packageDir, 'src/csrf-validation.test.ts'),
        join(packageDir, 'src/csrf.test.ts'),
        join(packageDir, 'src/security-headers.test.ts'),
      ])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/server'),
      ).toBe(true)
    },
  )
})
