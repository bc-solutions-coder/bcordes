import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guards the h3 resolution fix (bcordes-0i2.1.3).
 *
 * src/server/middleware/{csrf-validation,security-headers}.ts import h3, but h3
 * was never a declared dependency. Vitest only resolved it through a hardcoded
 * alias into a hash-suffixed pnpm store path (which any workspace re-resolve
 * silently invalidates), and TypeScript could not resolve it at all (TS2307).
 * The fix is a real h3 dependency on apps/web, resolvable by the plain Node/TS
 * algorithm with no Vite alias in play.
 *
 * Resolution is probed in a child process with NODE_PATH cleared: the pnpm bin
 * shim sets NODE_PATH to the hidden hoist dir (node_modules/.pnpm/node_modules),
 * which lets an *undeclared* package resolve at runtime under `pnpm vitest`.
 * tsc and Vite ignore NODE_PATH, so an in-process check would pass while the
 * real defect stands.
 */

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function findRepoRoot(from: string): string {
  let dir = from
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir)
    if (parent === dir) throw new Error('pnpm-workspace.yaml not found')
    dir = parent
  }
  return dir
}

const repoRoot = findRepoRoot(appDir)

const vitestConfigs = [
  join(repoRoot, 'vitest.config.ts'),
  join(appDir, 'vitest.config.ts'),
].filter((path) => existsSync(path))

function resolveFromAppWithoutNodePath(specifier: string): string {
  return execFileSync(
    process.execPath,
    [
      '-e',
      `const { createRequire } = require('node:module')
       process.stdout.write(
         createRequire(process.argv[1]).resolve(process.argv[2]),
       )`,
      join(appDir, 'package.json'),
      specifier,
    ],
    { env: { ...process.env, NODE_PATH: '' }, encoding: 'utf8' },
  )
}

describe('h3 resolution', () => {
  it('has vitest configs to check', () => {
    expect(vitestConfigs.length).toBeGreaterThan(0)
  })

  it.each(vitestConfigs)('%s hardcodes no pnpm store path', (path) => {
    expect(readFileSync(path, 'utf8')).not.toMatch(/\.pnpm\//)
  })

  it('declares h3 as a dependency of apps/web', () => {
    const pkg = JSON.parse(
      readFileSync(join(appDir, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    expect({ ...pkg.dependencies, ...pkg.devDependencies }).toHaveProperty('h3')
  })

  it('installs h3 into apps/web/node_modules', () => {
    expect(existsSync(join(appDir, 'node_modules', 'h3'))).toBe(true)
  })

  it('resolves h3 from apps/web without a vite alias or NODE_PATH fallback', () => {
    expect(() => resolveFromAppWithoutNodePath('h3/package.json')).not.toThrow()
  })

  it('resolves h3 to the v2 API the server middleware imports', () => {
    const pkg = JSON.parse(
      readFileSync(resolveFromAppWithoutNodePath('h3/package.json'), 'utf8'),
    ) as { version: string }

    expect(pkg.version).toMatch(/^2\./)
  })
})
