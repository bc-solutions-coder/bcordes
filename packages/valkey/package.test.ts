import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
        ':!packages/valkey/package.test.ts',
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

/** Unset REDIS_URL so getValkey throws before opening a connection. */
const importBarrel = async () => {
  vi.resetModules()
  vi.stubEnv('REDIS_URL', '')
  return import('./src/index')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('@bcordes/valkey package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/valkey')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('exports its source entrypoint (no build step, no dist/)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports).toMatchObject({ '.': './src/index.ts' })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('owns ioredis as a runtime dep and its types as a dev dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies).toMatchObject({ ioredis: expect.any(String) })
    expect(manifest.devDependencies).toMatchObject({
      '@types/ioredis': expect.any(String),
    })
  })
})

describe('the source really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/lib/valkey', () => {
    expect(existsSync(join(webDir, 'src/lib/valkey'))).toBe(false)
  })

  it('keeps client.ts and keys.ts behind the barrel', () => {
    expect(existsSync(join(packageDir, 'src/client.ts'))).toBe(true)
    expect(existsSync(join(packageDir, 'src/keys.ts'))).toBe(true)
  })
})

describe('the scoped barrel keeps its public API', () => {
  it('exports exactly getValkey and keys at runtime', async () => {
    const mod = await importBarrel()

    expect(Object.keys(mod).sort()).toEqual(['getValkey', 'keys'])
    expect(typeof mod.getValkey).toBe('function')
  })

  it('re-exports the Redis type from the barrel', () => {
    const index = readFileSync(join(packageDir, 'src/index.ts'), 'utf8')

    expect(index).toMatch(/export type \{ Redis \} from '\.\/client'/)
  })

  it('exposes every key builder through the barrel', async () => {
    const { keys } = await importBarrel()

    expect(keys.session('abc')).toBe('bcordes:session:abc')
    expect(keys.sessionLock('abc')).toBe('bcordes:lock:session:abc')
    expect(keys.serviceToken()).toBe('bcordes:service-token')
    expect(keys.serviceTokenLock()).toBe('bcordes:lock:service-token')
    expect(keys.oidcConfig()).toBe('bcordes:oidc-config')
  })

  it('surfaces getValkey through the barrel, still lazy and still guarded', async () => {
    const { getValkey } = await importBarrel()

    // Importing the package must not open a connection.
    expect(() => getValkey()).toThrow('REDIS_URL')
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))

    expect(web.dependencies['@bcordes/valkey']).toBe('workspace:*')
  })

  it('takes ioredis and @types/ioredis off apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))
    const declared = { ...web.dependencies, ...web.devDependencies }

    expect(declared).not.toHaveProperty('ioredis')
    expect(declared).not.toHaveProperty('@types/ioredis')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/valkey')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it("resolves its '.' export from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/valkey'))).toBe(
      realpathSync(join(packageDir, 'src/index.ts')),
    )
  })
})

describe('every importer was rewritten', () => {
  it('leaves no @/lib/valkey import anywhere', () => {
    expect(filesMatching('@/lib/valkey')).toEqual([])
  })

  it('redirects every former importer to @bcordes/valkey', () => {
    const importers = filesMatching("from '@bcordes/valkey'")

    expect(importers).toEqual(
      expect.arrayContaining(['apps/web/src/routes/api/health.ts']),
    )
  })

  it('leaves no direct ioredis import in apps/web', () => {
    // Scope this check to the app; the package owns the ioredis connection.
    expect(filesMatching("from 'ioredis'", ['apps'])).toEqual([])
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
              '@bcordes/valkey',
            ],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual([
        join(packageDir, 'package.test.ts'),
        join(packageDir, 'src/client.test.ts'),
        join(packageDir, 'src/sdk.test.ts'),
      ])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/valkey'),
      ).toBe(true)
    },
  )
})
