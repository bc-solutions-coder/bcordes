import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// These specs verify that @bcordes/logger is a real, wired-up workspace package
// rather than a directory that happens to hold a file: pnpm links it, Node
// resolves its '.' export from apps/web, pino and its pretty transport belong to
// the package rather than to the app, every former importer (source and the test
// files that mock it) now goes through the package, and the package's own tests
// run in the root vitest.

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

/**
 * Tracked + untracked (but not gitignored) files under apps/ and packages/
 * matching `pattern`. git grep exits 1 when nothing matches, which is a valid
 * answer here, not an error.
 *
 * This file is excluded from its own search: it quotes the very import path it
 * forbids, so without the exclusion it would always report itself as the sole
 * violator. Every other file under apps/ and packages/ is still searched.
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

/**
 * The 10 non-test files that did `import logger from '@/lib/logger'`. A floor,
 * not an exact count, so that later extractions (which move some of these files
 * into other packages) do not have to revisit this spec.
 */
const FORMER_IMPORTER_COUNT = 10

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

    // pino is imported by the module itself. pino-pretty is only ever loaded as
    // a transport target in development, so it stays a devDependency exactly as
    // it was on apps/web. A package declares what it uses rather than leaning on
    // root hoisting.
    expect(manifest.dependencies).toMatchObject({ pino: expect.any(String) })
    expect(manifest.devDependencies).toMatchObject({
      'pino-pretty': expect.any(String),
    })
  })
})

describe('the source really moved out of apps/web', () => {
  it('leaves nothing behind at apps/web/src/lib/logger.ts', () => {
    // A copy left behind would let the app keep resolving @/lib/logger and hide
    // a half-finished extraction.
    expect(existsSync(join(webDir, 'src/lib/logger.ts'))).toBe(false)
  })

  it('default-exports a working pino logger', async () => {
    // Pinned to production so importing the module does not spin up the
    // pino-pretty transport worker thread; the dev branch is the same pino
    // logger with a prettifying transport bolted on.
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const logger = (await import('./src/index')).default

      expect(logger.level).toBe(process.env.LOG_LEVEL ?? 'info')
      for (const method of ['info', 'error', 'warn', 'debug'] as const) {
        expect(typeof logger[method]).toBe('function')
      }
      // Callers lean on child loggers (sse-stream, request, session all do).
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

    // logger.ts was their only importer in the whole app; leaving them declared
    // here would let apps/web reach for pino directly without anyone noticing.
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
    // The acceptance criterion, executed. Covers the nine test files that mock
    // the logger as well as the ten that import it.
    expect(filesMatching('@/lib/logger')).toEqual([])
  })

  it('redirects every former importer to @bcordes/logger', () => {
    // A floor, not an exact count: this proves the imports were REDIRECTED, not
    // quietly dropped.
    const importers = filesMatching("from '@bcordes/logger'")

    expect(importers.length).toBeGreaterThanOrEqual(FORMER_IMPORTER_COUNT)
    expect(importers).toEqual(
      expect.arrayContaining([
        'apps/web/src/start.ts',
        'apps/web/src/lib/auth/session.ts',
        'apps/web/src/lib/wallow/request.ts',
        'apps/web/src/routes/api/notifications/stream.ts',
      ]),
    )
  })

  it('leaves no direct pino import in apps/web', () => {
    // The whole point of the package: pino is an implementation detail of
    // @bcordes/logger now, and the app talks to the logger, not to pino. Scoped
    // to apps/ on purpose — packages/logger/src/index.ts is the one file in the
    // repo that is *supposed* to import pino.
    expect(filesMatching("from 'pino'", ['apps'])).toEqual([])
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
