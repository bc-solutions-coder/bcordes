import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

// These specs verify that @bcordes/valkey is a real, wired-up workspace package
// rather than a directory that happens to hold some files: pnpm links it, Node
// resolves its '.' export from apps/web, ioredis belongs to the package rather
// than to the app, every former importer (source and the test files that mock
// it) now goes through the package, and its own tests run in the root vitest.
//
// Unlike utils and logger, valkey keeps a barrel: src/index.ts is a SCOPED
// MODULE API and one of only two sanctioned barrel files in the repo
// (CLAUDE.md). Consumers import { getValkey, keys } from the package root and
// never reach for ./client or ./keys, so the shape of that barrel is part of
// the contract and is asserted here, not merely the fact that files moved.

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

/**
 * The 3 non-test files that imported from '@/lib/valkey' (session.ts,
 * service-client.ts, health.ts). A floor, not an exact count, so that later
 * extractions — which move some of these files into other packages — do not
 * have to revisit this spec.
 */
const FORMER_IMPORTER_COUNT = 3

/**
 * Imports the barrel fresh, with no VALKEY_URL, so nothing ever constructs a
 * real ioredis client: getValkey() is lazy and throws before connecting.
 */
const importBarrel = async () => {
  vi.resetModules()
  vi.stubEnv('VALKEY_URL', '')
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

    // The barrel IS the entrypoint. Nothing deep-imports ./client or ./keys.
    expect(manifest.exports).toMatchObject({ '.': './src/index.ts' })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('owns ioredis as a runtime dep and its types as a dev dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // A package declares what it imports rather than leaning on root hoisting.
    expect(manifest.dependencies).toMatchObject({ ioredis: expect.any(String) })
    expect(manifest.devDependencies).toMatchObject({
      '@types/ioredis': expect.any(String),
    })
  })
})

describe('the source really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/lib/valkey', () => {
    // A leftover copy would keep @/lib/valkey resolving and hide a half-done
    // extraction.
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

    // Exact, not a superset: the barrel is a deliberate module API, so widening
    // it (re-exporting ./client wholesale, say) is a change worth failing on.
    expect(Object.keys(mod).sort()).toEqual(['getValkey', 'keys'])
    expect(typeof mod.getValkey).toBe('function')
  })

  it('re-exports the Redis type from the barrel', () => {
    // Type-only exports are erased at runtime, so this is the one part of the
    // public surface that has to be read off the source.
    const index = readFileSync(join(packageDir, 'src/index.ts'), 'utf8')

    expect(index).toMatch(/export type \{ Redis \} from '\.\/client'/)
  })

  it('exposes every key builder through the barrel', async () => {
    const { keys } = await importBarrel()

    // The five namespaced keys the session store and the service-token cache
    // agree on. Their exact strings are live data in Valkey — a rename here
    // silently orphans every session in production.
    expect(keys.session('abc')).toBe('bcordes:session:abc')
    expect(keys.sessionLock('abc')).toBe('bcordes:lock:session:abc')
    expect(keys.serviceToken()).toBe('bcordes:service-token')
    expect(keys.serviceTokenLock()).toBe('bcordes:lock:service-token')
    expect(keys.oidcConfig()).toBe('bcordes:oidc-config')
  })

  it('surfaces getValkey through the barrel, still lazy and still guarded', async () => {
    const { getValkey } = await importBarrel()

    // Reaching the barrel must not construct a client on import, and the
    // missing-config guard must survive the move (VALKEY_URL is unset here).
    expect(() => getValkey()).toThrow('VALKEY_URL')
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

    // client.ts was their only importer in the whole app; leaving them declared
    // here would let apps/web reach for ioredis directly without anyone
    // noticing, which is exactly what the barrel exists to prevent.
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
    // The acceptance criterion, executed. Covers the five test files that mock
    // the module as well as the three that import it.
    expect(filesMatching('@/lib/valkey')).toEqual([])
  })

  it('redirects every former importer to @bcordes/valkey', () => {
    // A floor, not an exact count: this proves the imports were REDIRECTED, not
    // quietly dropped.
    const importers = filesMatching("from '@bcordes/valkey'")

    expect(importers.length).toBeGreaterThanOrEqual(FORMER_IMPORTER_COUNT)
    expect(importers).toEqual(
      expect.arrayContaining([
        'apps/web/src/lib/auth/session.ts',
        'apps/web/src/lib/wallow/service-client.ts',
        'apps/web/src/routes/api/health.ts',
      ]),
    )
  })

  it('leaves no direct ioredis import in apps/web', () => {
    // The whole point of the package: ioredis is an implementation detail of
    // @bcordes/valkey now, and the app talks to the barrel, not to Redis.
    // Scoped to apps/ on purpose — packages/valkey/src/client.ts is the one
    // file in the repo that is *supposed* to import ioredis.
    expect(filesMatching("from 'ioredis'", ['apps'])).toEqual([])
  })
})

describe('the package runs in the root vitest', () => {
  it(
    "collects the package's own tests as its own project",
    { timeout: 120_000 },
    () => {
      // packages/* in the root vitest projects glob is only worth anything if a
      // new package is picked up with no root-side edit at all.
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
      ])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/valkey'),
      ).toBe(true)
    },
  )
})
