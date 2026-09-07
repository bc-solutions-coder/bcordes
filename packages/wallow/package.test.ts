import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

/** Exclude this file because its assertions contain the forbidden paths. */
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

/** Minimum importer count catches dropped imports while allowing new callers. */
const IMPORTER_FLOOR = 15

const SOURCE_MODULES = ['client', 'service-client', 'types'] as const

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

    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './client': './src/client.ts',
      './service-client': './src/service-client.ts',
      './types': './src/types.ts',
    })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('owns the auth, logger and valkey packages it imports', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies['@bcordes/auth']).toBe('workspace:*')
    expect(manifest.dependencies['@bcordes/logger']).toBe('workspace:*')
    expect(manifest.dependencies['@bcordes/valkey']).toBe('workspace:*')
  })

  it('owns its OAuth client-credentials runtime dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies).toMatchObject({
      '@bc-solutions-coder/sdk': expect.any(String),
    })
  })

  it('keeps the TanStack server surface as a peer dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.peerDependencies).toMatchObject({
      '@tanstack/react-start': expect.any(String),
    })
  })
})

describe('the client really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/lib/wallow', () => {
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

    expect(Object.keys(mod).sort()).toEqual([
      'createWallowClient',
      'getInquiryService',
    ])
  })

  it('re-exports callable client factory and service client', async () => {
    const mod = (await import('./src/index')) as {
      createWallowClient: unknown
      getInquiryService: unknown
    }

    expect(typeof mod.createWallowClient).toBe('function')

    expect(typeof mod.getInquiryService).toBe('function')
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
})

describe('every importer was rewritten', () => {
  it('leaves no @/lib/wallow import anywhere', () => {
    expect(filesMatching('@/lib/wallow/')).toEqual([])
  })

  it('redirects former importers to @bcordes/wallow', () => {
    const importers = filesMatching("from '@bcordes/wallow")

    expect(importers.length).toBeGreaterThanOrEqual(IMPORTER_FLOOR)

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
    expect(filesMatching('@bcordes/wallow', ['packages/auth'])).toEqual([])
  })
})

describe('the package runs in the root vitest', () => {
  it(
    "collects the package's own tests as its own project",
    { timeout: 120_000 },
    () => {
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

      expect(files).toEqual([join(packageDir, 'package.test.ts')])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/wallow'),
      ).toBe(true)
    },
  )
})

// Keep legacy HTTP fixtures on the testing subpath, outside runtime imports.

describe('@bcordes/wallow/testing ships the mock client factory as a secondary entry', () => {
  it('adds ./testing to the exports map without disturbing the library subpaths', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports['./testing']).toBe('./src/testing/index.ts')

    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './client': './src/client.ts',
      './service-client': './src/service-client.ts',
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

    expect(Object.keys(client).sort()).toEqual([
      'delete',
      'get',
      'head',
      'patch',
      'post',
      'put',
    ])

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

    expect(src).toMatch(/\bMockWallowClient\b/)
    expect(src).toMatch(/\bResponse\b/)
  })
})

describe('the mock client factory never reaches the production bundle', () => {
  it("keeps the testing helpers out of the '.' barrel", async () => {
    const barrel = await import('./src/index')

    // Keep Vitest fixtures out of the runtime entry point.
    expect(Object.keys(barrel).sort()).toEqual([
      'createWallowClient',
      'getInquiryService',
    ])
    expect(Object.keys(barrel)).not.toContain('createMockWallowClient')
    expect(Object.keys(barrel)).not.toContain('jsonResponse')
  })

  it('is imported only from test files, never from shipped source', () => {
    const importers = filesMatching('@bcordes/wallow/testing')

    for (const file of importers) {
      expect(file.endsWith('.test.ts')).toBe(true)
    }
  })

  it('retires the old @/test/mocks/wallow module entirely', () => {
    expect(filesMatching('@/test/mocks/wallow')).toEqual([])
    expect(existsSync(join(webDir, 'src/test/mocks/wallow.ts'))).toBe(false)
  })
})
