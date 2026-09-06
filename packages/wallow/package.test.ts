import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// These specs verify that @bcordes/wallow is a real, wired-up workspace package
// rather than a directory that happens to hold some files: the .NET backend
// client moved out of apps/web, pnpm links the package, Node resolves its '.'
// export from apps/web, every former importer (source and the test files that
// mock it) now goes through the package, auth never gains a back-edge on
// wallow, and the package's own risk-bearing tests (token refresh + 401/429
// retry for both the user and service clients) run inside the root vitest.
//
// The package mirrors the old file layout as subpath exports (./client,
// ./service-client, ./errors, ./config, ./types) so the call sites are a
// mechanical @/lib/wallow/x -> @bcordes/wallow/x rewrite. request.ts has no
// external consumer and stays internal, with no subpath. The '.' barrel is the
// package's canonical public entry: it re-exports the runtime surface
// (createWallowClient, serviceClient, WallowError, isWallowError) plus the
// ./types type surface, so external code can import them from '@bcordes/wallow'.

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
        ':!packages/wallow/package.test.ts',
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
 * A floor, not an exact count: ~19 source and test files import from
 * @bcordes/wallow after the move. A floor proves the imports were REDIRECTED,
 * not quietly dropped, without being brittle as later features relocate some
 * of these files into other packages.
 */
const IMPORTER_FLOOR = 15

/** The six modules that move out of apps/web/src/lib/wallow. */
const SOURCE_MODULES = [
  'client',
  'service-client',
  'request',
  'errors',
  'config',
  'types',
] as const

describe('@bcordes/wallow package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/wallow')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('maps the old file layout to subpath exports (no build step, no dist/)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // Subpaths mirror the externally-consumed source files so importers stay a
    // 1:1 rewrite. request.ts is internal (no subpath). './testing' (the mock
    // client factory) is deliberately left to T7.2, so this is a floor, not an
    // exact exports map.
    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './client': './src/client.ts',
      './service-client': './src/service-client.ts',
      './errors': './src/errors.ts',
      './config': './src/config.ts',
      './types': './src/types.ts',
    })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('owns the auth, logger and valkey packages it imports', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // client.ts pulls @bcordes/auth/{session,oidc,types}; request.ts pulls
    // @bcordes/logger; service-client.ts pulls @bcordes/valkey. A package
    // declares what it imports rather than leaning on root hoisting.
    expect(manifest.dependencies['@bcordes/auth']).toBe('workspace:*')
    expect(manifest.dependencies['@bcordes/logger']).toBe('workspace:*')
    expect(manifest.dependencies['@bcordes/valkey']).toBe('workspace:*')
  })

  it('owns its OAuth client-credentials runtime dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // service-client.ts drives openid-client (discovery +
    // clientCredentialsGrant) directly, so it is a declared dep here.
    expect(manifest.dependencies).toMatchObject({
      'openid-client': expect.any(String),
    })
  })

  it('keeps the TanStack server surface as a peer dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // Both clients throw through setResponseStatus from
    // @tanstack/react-start/server — the host app's singleton, so it is a peer,
    // not a bundled dep.
    expect(manifest.peerDependencies).toMatchObject({
      '@tanstack/react-start': expect.any(String),
    })
  })
})

describe('the client really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/lib/wallow', () => {
    // A leftover copy would keep @/lib/wallow/* resolving and hide a half-done
    // extraction.
    expect(existsSync(join(webDir, 'src/lib/wallow'))).toBe(false)
  })

  it('carries every source module into packages/wallow/src', () => {
    for (const mod of SOURCE_MODULES) {
      expect(existsSync(join(packageDir, `src/${mod}.ts`))).toBe(true)
    }
  })
})

describe("the '.' barrel exposes the public runtime surface", () => {
  it('exports exactly the client factory, service client and error helpers', async () => {
    const mod = await import('./src/index')

    // Exact, not a superset: the request-level helpers (parseProblemDetails,
    // toNetworkError, ...) are internal, and the types ride the type-only
    // re-export, which is erased at runtime. Widening the runtime surface is a
    // design change worth failing on.
    expect(Object.keys(mod).sort()).toEqual([
      'WallowError',
      'createWallowClient',
      'isWallowError',
      'serviceClient',
    ])
  })

  it('re-exports callable client factory and service client', async () => {
    const mod = (await import('./src/index')) as {
      createWallowClient: unknown
      serviceClient: Record<string, unknown>
    }

    expect(typeof mod.createWallowClient).toBe('function')
    // serviceClient is a pre-built object of HTTP verb methods, not a factory.
    expect(typeof mod.serviceClient.get).toBe('function')
    expect(typeof mod.serviceClient.post).toBe('function')
  })

  it('round-trips the WallowError contract through the barrel', async () => {
    const { WallowError, isWallowError } = (await import('./src/index')) as {
      WallowError: new (problem: {
        type: string
        title: string
        status: number
        detail: string
        traceId: string
        code: string
        errors?: Record<string, Array<string>>
      }) => Error & {
        status: number
        code: string
        isNotFound: boolean
        isValidation: boolean
      }
      isWallowError: (v: unknown) => boolean
    }

    const err = new WallowError({
      type: 'https://httpstatuses.com/404',
      title: 'Not Found',
      status: 404,
      detail: 'missing',
      traceId: '',
      code: 'NOT_FOUND',
    })

    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.isNotFound).toBe(true)
    expect(isWallowError(err)).toBe(true)
    expect(isWallowError(new Error('plain'))).toBe(false)
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))

    expect(web.dependencies['@bcordes/wallow']).toBe('workspace:*')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/wallow')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it("resolves its '.' export from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/wallow'))).toBe(
      realpathSync(join(packageDir, 'src/index.ts')),
    )
  })

  it('reads its backend base URL from the environment inside the package', () => {
    // WALLOW_API_URL is read via process.env inside config.ts; the package must
    // not reach back into apps/web for it. README documents the required var.
    const config = readFileSync(join(packageDir, 'src/config.ts'), 'utf8')
    expect(config).toMatch(/process\.env\.WALLOW_API_URL/)

    const readme = readFileSync(join(packageDir, 'README.md'), 'utf8')
    expect(readme).toMatch(/WALLOW_API_URL/)
  })
})

describe('every importer was rewritten', () => {
  it('leaves no @/lib/wallow import anywhere', () => {
    // The acceptance criterion, executed. Covers the consumer test files that
    // mock the module (including vi.doMock and dynamic import() targets), the
    // source importers, and the JSDoc reference in the mock factory.
    expect(filesMatching('@/lib/wallow/')).toEqual([])
  })

  it('redirects former importers to @bcordes/wallow', () => {
    const importers = filesMatching("from '@bcordes/wallow")

    expect(importers.length).toBeGreaterThanOrEqual(IMPORTER_FLOOR)
    // A few stable app-side call sites that no later feature relocates.
    expect(importers).toEqual(
      expect.arrayContaining([
        'apps/web/src/features/inquiries/server-fns/inquiries.ts',
        'apps/web/src/features/notifications/server-fns/notifications.ts',
        'apps/web/src/features/notifications/lib/routing.ts',
        'apps/web/src/features/notifications/components/NotificationBell.tsx',
      ]),
    )
  })
})

describe('no cycle: wallow never leaks back into auth', () => {
  it('imports nothing from @bcordes/wallow inside packages/auth', () => {
    // wallow depends on auth (client.ts imports @bcordes/auth/{session,oidc,
    // types}); the edge is directed. If auth ever imported @bcordes/wallow it
    // would close a cycle. Guard it now — re-verified in T7.2's acceptance.
    expect(filesMatching('@bcordes/wallow', ['packages/auth'])).toEqual([])
  })
})

describe('the package runs in the root vitest', () => {
  it(
    "collects the package's own tests as its own project",
    { timeout: 120_000 },
    () => {
      // packages/* in the root vitest projects glob is only worth anything if a
      // new package is picked up with no root-side edit at all. This also proves
      // the risk-bearing token-refresh / 401-429-retry unit tests run inside the
      // package.
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
              '@bcordes/wallow',
            ],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual([
        join(packageDir, 'package.test.ts'),
        join(packageDir, 'src/client.test.ts'),
        join(packageDir, 'src/errors.test.ts'),
        join(packageDir, 'src/request.test.ts'),
        join(packageDir, 'src/service-client.test.ts'),
      ])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/wallow'),
      ).toBe(true)
    },
  )
})

// ---------------------------------------------------------------------------
// T7.2 — the '@bcordes/wallow/testing' secondary entry.
//
// The mock WallowClient factory + Response builders that used to live at
// apps/web's @/test/mocks/wallow move into the package as a dedicated
// '/testing' subpath. This is the same multi-entrypoint mechanism the auth
// /testing entry (T6.2) established: the subpath is additive (it does not touch
// the library exports), it resolves from a consumer, it hands back a vitest-
// mocked MockWallowClient plus jsonResponse/textResponse helpers — and,
// load-bearing, the fixtures never leak into the '.' barrel or any shipped
// source, so they cannot reach the production bundle.
// ---------------------------------------------------------------------------

describe('@bcordes/wallow/testing ships the mock client factory as a secondary entry', () => {
  it('adds ./testing to the exports map without disturbing the library subpaths', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports['./testing']).toBe('./src/testing/index.ts')
    // /testing is purely additive — the six library subpaths from T7.1 are
    // untouched.
    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './client': './src/client.ts',
      './service-client': './src/service-client.ts',
      './errors': './src/errors.ts',
      './config': './src/config.ts',
      './types': './src/types.ts',
    })
    expect(existsSync(join(packageDir, 'src/testing/index.ts'))).toBe(true)
  })

  it("resolves the '/testing' subpath from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(
      realpathSync(requireFromWeb.resolve('@bcordes/wallow/testing')),
    ).toBe(realpathSync(join(packageDir, 'src/testing/index.ts')))
  })

  it('exports exactly the mock client factory and the two response builders', async () => {
    const mod = await import('./src/testing/index')

    // The full runtime surface from the old @/test/mocks/wallow. MockWallowClient
    // is a type (erased at runtime), so it does not appear here.
    expect(Object.keys(mod).sort()).toEqual([
      'createMockWallowClient',
      'jsonResponse',
      'textResponse',
    ])
    for (const factory of Object.values(mod)) {
      expect(typeof factory).toBe('function')
    }
  })

  it('builds a MockWallowClient whose verb methods are vitest mocks', async () => {
    const { createMockWallowClient } = await import('./src/testing/index')

    const client = createMockWallowClient()
    // The mock mirrors the real WallowClient verb surface, extended with `head`.
    expect(Object.keys(client).sort()).toEqual([
      'delete',
      'get',
      'head',
      'patch',
      'post',
      'put',
    ])
    // Every method is a vi.fn() so tests can assert on calls / override results.
    for (const method of Object.values(client)) {
      expect(vi.isMockFunction(method)).toBe(true)
    }
  })

  it('defaults every mock verb to a 200 JSON response', async () => {
    const { createMockWallowClient } =
      (await import('./src/testing/index')) as {
        createMockWallowClient: () => {
          get: (path: string) => Promise<Response>
          post: (path: string, body?: unknown) => Promise<Response>
        }
      }

    const client = createMockWallowClient()
    const res = await client.get('/anything')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/json')
    expect(await res.json()).toEqual({})
    expect((await client.post('/x', { a: 1 })).status).toBe(200)
  })

  it('builds JSON and text Responses from the helper factories', async () => {
    const { jsonResponse, textResponse } =
      (await import('./src/testing/index')) as {
        jsonResponse: (data: unknown, status?: number) => Response
        textResponse: (body: string, status?: number) => Response
      }

    const json = jsonResponse({ hello: 'world' }, 201)
    expect(json.status).toBe(201)
    expect(json.headers.get('Content-Type')).toBe('application/json')
    expect(await json.json()).toEqual({ hello: 'world' })

    const text = textResponse('plain body', 404)
    expect(text.status).toBe(404)
    expect(text.headers.get('Content-Type')).toBe('text/plain')
    expect(await text.text()).toBe('plain body')
  })

  it('is typed against the wallow client surface rather than any', () => {
    const src = readFileSync(join(packageDir, 'src/testing/index.ts'), 'utf8')

    // The factory annotates a MockWallowClient built from vitest mocks over the
    // real Response type, so consumers get compile-time shape checking. This
    // pins that the entry does not silently degrade to `any`.
    expect(src).toMatch(/\bMockWallowClient\b/)
    expect(src).toMatch(/\bResponse\b/)
  })
})

describe('the mock client factory never reaches the production bundle', () => {
  it("keeps the testing helpers out of the '.' barrel", async () => {
    const barrel = await import('./src/index')

    // The '.' entry is what apps/web's runtime graph can reach. It must expose
    // only the client/error runtime surface; a createMockWallowClient leaking in
    // here would make the fixtures reachable from — and bundled into — the
    // production build.
    expect(Object.keys(barrel).sort()).toEqual([
      'WallowError',
      'createWallowClient',
      'isWallowError',
      'serviceClient',
    ])
    expect(Object.keys(barrel)).not.toContain('createMockWallowClient')
    expect(Object.keys(barrel)).not.toContain('jsonResponse')
  })

  it('is imported only from test files, never from shipped source', () => {
    const importers = filesMatching('@bcordes/wallow/testing')

    // The rewrite happened (former @/test/mocks/wallow consumers now point
    // here)...
    expect(importers.length).toBeGreaterThan(0)
    // ...and every consumer is a *.test.ts. apps/web's production build graph
    // starts from route/source modules and excludes *.test.ts, so a testing-only
    // import surface is the concrete guarantee the fixtures cannot ship to prod.
    for (const file of importers) {
      expect(file.endsWith('.test.ts')).toBe(true)
    }
  })

  it('retires the old @/test/mocks/wallow module entirely', () => {
    // Acceptance criterion: no call site keeps the app-local mock path, and the
    // source file itself is gone (moved into the package).
    expect(filesMatching('@/test/mocks/wallow')).toEqual([])
    expect(existsSync(join(webDir, 'src/test/mocks/wallow.ts'))).toBe(false)
  })
})
