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
        ':!packages/logger/package.test.ts',
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

describe('@bcordes/logger package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/logger')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('exports its source entrypoint (no build step, no dist/)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports).toMatchObject({ '.': './src/index.ts' })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('declares pino as a runtime dep and pino-pretty as a dev dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // pino-pretty is loaded whenever NODE_ENV is not production.
    expect(manifest.dependencies).toMatchObject({ pino: expect.any(String) })
    expect(manifest.devDependencies).toMatchObject({
      'pino-pretty': expect.any(String),
    })
  })
})

describe('the source really moved out of apps/web', () => {
  it('leaves nothing behind at apps/web/src/lib/logger.ts', () => {
    expect(existsSync(join(webDir, 'src/lib/logger.ts'))).toBe(false)
  })

  it('default-exports a working pino logger', async () => {
    // Production mode avoids starting the pino-pretty worker thread.
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const logger = (await import('./src/index')).default

      expect(logger.level).toBe(process.env.LOG_LEVEL ?? 'info')
      for (const method of ['info', 'error', 'warn', 'debug'] as const) {
        expect(typeof logger[method]).toBe('function')
      }

      expect(typeof logger.child({ scope: 'test' }).info).toBe('function')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))

    expect(web.dependencies['@bcordes/logger']).toBe('workspace:*')
  })

  it('takes pino and pino-pretty off apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))
    const declared = { ...web.dependencies, ...web.devDependencies }

    expect(declared).not.toHaveProperty('pino')
    expect(declared).not.toHaveProperty('pino-pretty')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/logger')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it("resolves its '.' export from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/logger'))).toBe(
      realpathSync(join(packageDir, 'src/index.ts')),
    )
  })
})

describe('every importer was rewritten', () => {
  it('leaves no @/lib/logger import anywhere', () => {
    expect(filesMatching('@/lib/logger')).toEqual([])
  })

  it('redirects every former importer to @bcordes/logger', () => {
    const importers = filesMatching("from '@bcordes/logger'")

    expect(importers).toEqual(expect.arrayContaining(['apps/web/src/start.ts']))
  })

  it('leaves no direct pino import in apps/web', () => {
    // Scope this check to the app; the package owns the pino dependency.
    expect(filesMatching("from 'pino'", ['apps'])).toEqual([])
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
              '@bcordes/logger',
            ],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual([join(packageDir, 'package.test.ts')])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/logger'),
      ).toBe(true)
    },
  )
})
