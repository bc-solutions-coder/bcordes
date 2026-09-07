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

const SOURCE_MODULES = ['security-headers'] as const

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
      './security-headers': './src/security-headers.ts',
    })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })
})

describe('the middleware really moved out of apps/web', () => {
  it('leaves nothing behind under apps/web/src/server/middleware', () => {
    expect(existsSync(join(webDir, 'src/server/middleware'))).toBe(false)

    expect(existsSync(join(webDir, 'src/server'))).toBe(false)
  })

  it('carries every source module into packages/server/src', () => {
    for (const mod of SOURCE_MODULES) {
      expect(existsSync(join(packageDir, `src/${mod}.ts`))).toBe(true)
    }
  })

  it('brings the behaviour tests along with their modules', () => {
    for (const testFile of ['src/security-headers.test.ts']) {
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

describe('the package entry point', () => {
  it('exports applySecurityHeaders', async () => {
    const mod = await import('./src/index')
    expect(Object.keys(mod)).toEqual(['applySecurityHeaders'])
    expect(typeof mod.applySecurityHeaders).toBe('function')
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
        join(packageDir, 'src/security-headers.test.ts'),
      ])
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/server'),
      ).toBe(true)
    },
  )
})
