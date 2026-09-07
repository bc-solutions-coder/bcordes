import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

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

/** Minimum importer count catches dropped imports while allowing new callers. */
const IMPORTER_FLOOR = 20

const SOURCE_MODULES = ['middleware', 'redact', 'session', 'types'] as const

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

    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './session': './src/session.ts',
      './middleware': './src/middleware.ts',
      './types': './src/types.ts',
    })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('owns its OIDC and sealing runtime deps', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies).toMatchObject({
      '@bc-solutions-coder/sdk': expect.any(String),
    })
  })

  it('depends on the already-extracted logger and valkey packages', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies['@bcordes/logger']).toBe('workspace:*')
    expect(manifest.dependencies['@bcordes/valkey']).toBe('workspace:*')
  })

  it('keeps the TanStack framework surface as peer deps', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // Peer dependencies share the host application's TanStack instance.
    expect(manifest.peerDependencies).toMatchObject({
      '@tanstack/react-start': expect.any(String),
      '@tanstack/react-router': expect.any(String),
    })
  })
})

describe('the library really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/lib/auth', () => {
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

    // Keep session and middleware exports on their dedicated subpaths.
    expect(Object.keys(mod).sort()).toEqual(['redact', 'redactUser'])
    expect(typeof (mod as { redact: unknown }).redact).toBe('function')
  })

  it('redacts secrets to their last four characters', async () => {
    const { redact } = (await import('./src/index')) as {
      redact: (v: string | undefined | null) => string
    }

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
    expect(filesMatching('@/lib/auth/')).toEqual([])
  })

  it('redirects former importers to @bcordes/auth', () => {
    const importers = filesMatching("from '@bcordes/auth")

    expect(importers.length).toBeGreaterThanOrEqual(IMPORTER_FLOOR)

    expect(importers).toEqual(
      expect.arrayContaining([
        'apps/web/src/shared/auth/hooks/useUser.ts',
        'apps/web/src/routes/auth/me.ts',
        'packages/server/src/csrf.ts',
      ]),
    )
  })
})

describe('no cycle: authz never leaks into auth', () => {
  it('imports nothing from @bcordes/authz inside packages/auth', () => {
    expect(filesMatching('@bcordes/authz', ['packages/auth'])).toEqual([])
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
            ['exec', 'vitest', 'list', '--json', '--project', '@bcordes/auth'],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual([
        join(packageDir, 'package.test.ts'),
        join(packageDir, 'src/middleware.test.ts'),
        join(packageDir, 'src/redact.test.ts'),
      ])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/auth'),
      ).toBe(true)
    },
  )
})

describe('@bcordes/auth/testing ships the mock factories as a secondary entry', () => {
  it('adds ./testing to the exports map without disturbing the library subpaths', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports['./testing']).toBe('./src/testing/index.ts')

    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './session': './src/session.ts',
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
      sub: expect.any(String),
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

    expect(src).toMatch(/\bSessionData\b/)
    expect(src).toMatch(/\bUser\b/)
  })
})

describe('the mock factories never reach the production bundle', () => {
  it("keeps the testing helpers out of the '.' barrel", async () => {
    const barrel = await import('./src/index')

    // Keep Vitest fixtures out of the runtime entry point.
    expect(Object.keys(barrel).sort()).toEqual(['redact', 'redactUser'])
    expect(Object.keys(barrel)).not.toContain('createMockUser')
    expect(Object.keys(barrel)).not.toContain('createMockSession')
  })

  it('is imported only from tests and E2E fixtures, never from shipped source', () => {
    const importers = filesMatching('@bcordes/auth/testing')

    expect(importers.length).toBeGreaterThan(0)
    // Unit tests and browser fixtures are outside the production module graph.
    for (const file of importers) {
      expect(
        /\.test\.tsx?$/.test(file) || file.startsWith('apps/web/e2e/fixtures/'),
      ).toBe(true)
    }
  })

  it('retires the old @/test/mocks/auth module entirely', () => {
    expect(filesMatching('@/test/mocks/auth')).toEqual([])
    expect(existsSync(join(webDir, 'src/test/mocks/auth.ts'))).toBe(false)
  })
})
