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

/** Clear NODE_PATH so pnpm's hidden hoist directory cannot hide missing dependencies. */
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

    expect(manifest.dependencies).toHaveProperty('h3')
  })

  it('depends on the already-extracted @bcordes/auth package', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies['@bcordes/auth']).toBe('workspace:*')
  })

  it('keeps the TanStack framework surface as a peer dep', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // Share the host application's TanStack instance.
    expect(manifest.peerDependencies).toMatchObject({
      '@tanstack/react-start': expect.any(String),
    })
  })
})

describe('the middleware really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/server/middleware', () => {
    expect(existsSync(join(webDir, 'src/server/middleware'))).toBe(false)

    expect(existsSync(join(webDir, 'src/server'))).toBe(false)
  })

  it('moves csrf.ts out of apps/web/src/server-fns (product server-fns stay)', () => {
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
    for (const testFile of [
      'src/csrf.test.ts',
      'src/csrf-validation.test.ts',
      'src/security-headers.test.ts',
      'src/csrf-token.test.ts',
    ]) {
      expect(existsSync(join(packageDir, testFile))).toBe(true)
    }

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

    // Keep createServerFn evaluation on the dedicated csrf subpath.
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
    expect(() => resolveFromWebWithoutNodePath('h3/package.json')).not.toThrow()
    const pkg = readJson(resolveFromWebWithoutNodePath('h3/package.json')) as {
      version: string
    }
    expect(pkg.version).toMatch(/^2\./)
  })
})

describe('every former importer was retired', () => {
  it('leaves no @/server/middleware import anywhere', () => {
    expect(filesMatching('@/server/middleware/')).toEqual([])
  })

  it('leaves no @/server-fns/csrf import anywhere', () => {
    expect(filesMatching('@/server-fns/csrf')).toEqual([])
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
