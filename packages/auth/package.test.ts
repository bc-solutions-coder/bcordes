import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// These specs verify that @bcordes/auth is a real, wired-up workspace package
// rather than a directory that happens to hold some files: the OIDC/session
// library moved out of apps/web, pnpm links the package, Node resolves its
// '.' export from apps/web, every former importer (source and the test files
// that mock it) now goes through the package, authz never leaks back in, and
// the package's own security-sensitive tests (session sealing, OIDC config)
// run inside the root vitest.
//
// The package deliberately mirrors the old file layout as subpath exports
// (./session, ./oidc, ./middleware, ./types) so the ~40 call sites are a
// mechanical @/lib/auth/x -> @bcordes/auth/x rewrite. The one exception is
// redact/redactUser, which had no subpath of their own: they become the
// content of the '.' barrel, so callback.ts and login.ts import them from
// '@bcordes/auth'.

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
 * violator and be unsatisfiable by any implementation. Every other file under
 * apps/ and packages/ is still searched.
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
        ':!packages/auth/package.test.ts',
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
 * A floor, not an exact count: ~25 source and test files import from
 * @bcordes/auth after the move. A floor proves the imports were REDIRECTED,
 * not quietly dropped, without being brittle as later features relocate some
 * of these files into other packages.
 */
const IMPORTER_FLOOR = 20

/** The six library modules that move out of apps/web/src/lib/auth. */
const SOURCE_MODULES = [
  'claims',
  'middleware',
  'oidc',
  'redact',
  'session',
  'types',
] as const

describe('@bcordes/auth package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/auth')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('maps the old file layout to subpath exports (no build step, no dist/)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // Subpaths mirror the source files so importers stay a 1:1 rewrite. The
    // '.' barrel is the new home for redact/redactUser. './testing' (the mock
    // factory) is deliberately left to T6.2, so this is a floor, not an exact
    // exports map.
    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './session': './src/session.ts',
      './oidc': './src/oidc.ts',
      './middleware': './src/middleware.ts',
      './types': './src/types.ts',
    })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('owns its OIDC and sealing runtime deps', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // A package declares what it imports rather than leaning on root hoisting.
    // openid-client and iron-webcrypto stay declared on apps/web too (its
    // service client and e2e fixtures still use them), so this asserts
    // ownership here, not removal there.
    expect(manifest.dependencies).toMatchObject({
      'openid-client': expect.any(String),
      'iron-webcrypto': expect.any(String),
    })
  })

  it('depends on the already-extracted logger and valkey packages', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies['@bcordes/logger']).toBe('workspace:*')
    expect(manifest.dependencies['@bcordes/valkey']).toBe('workspace:*')
  })

  it('keeps the TanStack framework surface as peer deps', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // session.ts reaches for cookie helpers in @tanstack/react-start/server and
    // middleware.ts throws redirect() from @tanstack/react-router; those are the
    // host app's singletons, so they are peers, not bundled deps.
    expect(manifest.peerDependencies).toMatchObject({
      '@tanstack/react-start': expect.any(String),
      '@tanstack/react-router': expect.any(String),
    })
  })
})

describe('the library really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/lib/auth', () => {
    // A leftover copy would keep @/lib/auth/* resolving and hide a half-done
    // extraction.
    expect(existsSync(join(webDir, 'src/lib/auth'))).toBe(false)
  })

  it('carries every source module into packages/auth/src', () => {
    for (const mod of SOURCE_MODULES) {
      expect(existsSync(join(packageDir, `src/${mod}.ts`))).toBe(true)
    }
  })
})

describe("the '.' barrel exposes the redaction helpers", () => {
  it('exports exactly redact and redactUser at runtime', async () => {
    const mod = await import('./src/index')

    // Exact, not a superset: the subpaths carry the rest of the surface, so the
    // barrel is only the home for the two symbols that had no subpath. Widening
    // it (re-exporting the guards or the whole session module) is a design
    // change worth failing on.
    expect(Object.keys(mod).sort()).toEqual(['redact', 'redactUser'])
    expect(typeof (mod as { redact: unknown }).redact).toBe('function')
  })

  it('redacts secrets to their last four characters', async () => {
    const { redact } = (await import('./src/index')) as {
      redact: (v: string | undefined | null) => string
    }

    // Round-trips the real behaviour through the package, without printing any
    // real secret: short values are fully masked, longer ones keep a 4-char tail.
    expect(redact(undefined)).toBe('[empty]')
    expect(redact('1234')).toBe('[redacted]')
    expect(redact('abcde')).toBe('[redacted:...bcde]')
  })

  it('narrows a user to non-sensitive fields', async () => {
    const { redactUser } = await import('./src/index')

    const result = redactUser({
      id: 'user-123',
      name: 'Bryan Cordes',
      email: 'bryan@example.com',
      roles: ['admin'],
      permissions: ['manage:users'],
      tenantId: 'tenant-1',
      tenantName: 'Acme',
    })

    expect(Object.keys(result).sort()).toEqual([
      'id',
      'name',
      'roles',
      'tenantId',
    ])
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('permissions')
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))

    expect(web.dependencies['@bcordes/auth']).toBe('workspace:*')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/auth')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it("resolves its '.' export from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/auth'))).toBe(
      realpathSync(join(packageDir, 'src/index.ts')),
    )
  })
})

describe('every importer was rewritten', () => {
  it('leaves no @/lib/auth import anywhere', () => {
    // The acceptance criterion, executed. Covers the ~14 test files that mock
    // the module (including dynamic import() and doUnmock targets), the source
    // importers, and the testing mock factory.
    expect(filesMatching('@/lib/auth/')).toEqual([])
  })

  it('redirects former importers to @bcordes/auth', () => {
    const importers = filesMatching("from '@bcordes/auth")

    expect(importers.length).toBeGreaterThanOrEqual(IMPORTER_FLOOR)
    // A few stable app-side call sites that no later feature relocates.
    expect(importers).toEqual(
      expect.arrayContaining([
        'apps/web/src/shared/auth/hooks/useUser.ts',
        'apps/web/src/routes/auth/me.ts',
        'apps/web/src/routes/auth/logout.ts',
        'packages/server/src/csrf.ts',
      ]),
    )
  })
})

describe('no cycle: authz never leaks into auth', () => {
  it('imports nothing from @bcordes/authz inside packages/auth', () => {
    // parseRoles/userFromClaims stay here as identity, not authorization. If
    // auth ever imported @bcordes/authz, the authz extraction (T9) would close
    // a cycle. Guard it now, cheaply, while authz does not yet exist.
    expect(filesMatching('@bcordes/authz', ['packages/auth'])).toEqual([])
  })
})

describe('the package runs in the root vitest', () => {
  it(
    "collects the package's own tests as its own project",
    { timeout: 120_000 },
    () => {
      // packages/* in the root vitest projects glob is only worth anything if a
      // new package is picked up with no root-side edit at all. This also proves
      // the security-sensitive session/oidc unit tests run inside the package.
      const collected: Array<{ file: string; projectName: string }> =
        JSON.parse(
          execFileSync(
            'pnpm',
            ['exec', 'vitest', 'list', '--json', '--project', '@bcordes/auth'],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual([
        join(packageDir, 'package.test.ts'),
        join(packageDir, 'src/middleware.test.ts'),
        join(packageDir, 'src/oidc.test.ts'),
        join(packageDir, 'src/redact.test.ts'),
        join(packageDir, 'src/session.test.ts'),
      ])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/auth'),
      ).toBe(true)
    },
  )
})

// ---------------------------------------------------------------------------
// T6.2 — the '@bcordes/auth/testing' secondary entry.
//
// The session/user mock factories that used to live at apps/web's
// @/test/mocks/auth move into the package as a dedicated '/testing' subpath.
// This is the same multi-entrypoint mechanism the wallow /testing entry (F7)
// will reuse, so it is pinned here: the subpath is additive (it does not touch
// the library exports), it resolves from a consumer, it hands back typed
// User/SessionData fixtures — and, load-bearing, the fixtures never leak into
// the '.' barrel or any shipped source, so they cannot reach the prod bundle.
// ---------------------------------------------------------------------------

describe('@bcordes/auth/testing ships the mock factories as a secondary entry', () => {
  it('adds ./testing to the exports map without disturbing the library subpaths', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports['./testing']).toBe('./src/testing/index.ts')
    // /testing is purely additive — the five library subpaths from T6.1 are
    // untouched.
    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './session': './src/session.ts',
      './oidc': './src/oidc.ts',
      './middleware': './src/middleware.ts',
      './types': './src/types.ts',
    })
    expect(existsSync(join(packageDir, 'src/testing/index.ts'))).toBe(true)
  })

  it("resolves the '/testing' subpath from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/auth/testing'))).toBe(
      realpathSync(join(packageDir, 'src/testing/index.ts')),
    )
  })

  it('exports exactly the four session/user mock factories', async () => {
    const mod = await import('./src/testing/index')

    // The full factory set from the old @/test/mocks/auth — the admin variants
    // are consumed too (server-fns/inquiries.test.ts) and must not be dropped.
    expect(Object.keys(mod).sort()).toEqual([
      'createMockAdminSession',
      'createMockAdminUser',
      'createMockSession',
      'createMockUser',
    ])
    for (const factory of Object.values(mod)) {
      expect(typeof factory).toBe('function')
    }
  })

  it('produces User- and SessionData-shaped fixtures', async () => {
    const { createMockUser, createMockSession } =
      await import('./src/testing/index')

    // Structural match against the ./types contract: proves the factories are
    // built against the real User / SessionData shapes, not ad-hoc bags.
    expect(Object.keys(createMockUser()).sort()).toEqual([
      'email',
      'id',
      'name',
      'permissions',
      'roles',
      'tenantId',
      'tenantName',
    ])
    const session = createMockSession()
    expect(Object.keys(session).sort()).toEqual([
      'accessToken',
      'expiresAt',
      'idToken',
      'refreshToken',
      'sessionId',
      'user',
      'version',
    ])
    expect(session.user).toMatchObject({
      id: expect.any(String),
      roles: expect.any(Array),
    })
  })

  it('honours overrides and builds admin fixtures', async () => {
    const { createMockUser, createMockAdminSession } =
      (await import('./src/testing/index')) as {
        createMockUser: (o?: { email?: string }) => { email: string }
        createMockAdminSession: () => { user: { roles: Array<string> } }
      }

    expect(createMockUser({ email: 'override@example.com' }).email).toBe(
      'override@example.com',
    )
    expect(createMockAdminSession().user.roles).toContain('admin')
  })

  it('is typed against the auth type surface rather than any', () => {
    const src = readFileSync(join(packageDir, 'src/testing/index.ts'), 'utf8')

    // The factories annotate against User / SessionData, so consumers get
    // compile-time shape checking. apps/web's typecheck gate is the real proof
    // this resolves; this pins the entry does not silently degrade to `any`.
    expect(src).toMatch(/\bSessionData\b/)
    expect(src).toMatch(/\bUser\b/)
  })
})

describe('the mock factories never reach the production bundle', () => {
  it("keeps the testing helpers out of the '.' barrel", async () => {
    const barrel = await import('./src/index')

    // The '.' entry is what apps/web's runtime graph can reach. It must expose
    // only the redaction helpers; a createMock* leaking in here would make the
    // fixtures reachable from — and bundled into — the production build.
    expect(Object.keys(barrel).sort()).toEqual(['redact', 'redactUser'])
    expect(Object.keys(barrel)).not.toContain('createMockUser')
    expect(Object.keys(barrel)).not.toContain('createMockSession')
  })

  it('is imported only from test files, never from shipped source', () => {
    const importers = filesMatching('@bcordes/auth/testing')

    // The rewrite happened (former @/test/mocks/auth consumers now point here)...
    expect(importers.length).toBeGreaterThan(0)
    // ...and every consumer is a *.test.ts. apps/web's production build graph
    // starts from route/source modules and excludes *.test.ts, so a
    // testing-only import surface is the concrete guarantee the fixtures cannot
    // ship to prod.
    for (const file of importers) {
      expect(file.endsWith('.test.ts')).toBe(true)
    }
  })

  it('retires the old @/test/mocks/auth module entirely', () => {
    // Acceptance criterion: no call site keeps the app-local mock path, and the
    // source file itself is gone (moved into the package).
    expect(filesMatching('@/test/mocks/auth')).toEqual([])
    expect(existsSync(join(webDir, 'src/test/mocks/auth.ts'))).toBe(false)
  })
})
