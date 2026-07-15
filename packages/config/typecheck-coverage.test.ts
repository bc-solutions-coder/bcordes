import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// These specs verify that `pnpm -r typecheck` actually covers the WHOLE
// workspace, not just apps/web. The root `typecheck` script is `pnpm -r
// typecheck`, which only runs in workspace packages that themselves declare a
// `typecheck` script. Every package extraction (config, utils, logger, valkey,
// ui, query, auth, ...) that moved code out of apps/web without adding a
// typecheck script silently dropped that code out of tsc scope — which is how
// the ratchet baseline drifted (105 -> 104 -> 101) as files moved. A package
// with a tsconfig.json but no typecheck script is invisible to the recursive
// run.
//
// So the coverage guarantee is exactly: every workspace package.json declares a
// `typecheck` script following the established `tsc --noEmit` pattern (the same
// string apps/web already uses), and the root script fans out recursively. This
// spec lives in @bcordes/config because that package owns the shared
// tsconfig.base.json every package extends.

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

/**
 * Every real workspace package: a directory under apps/* or packages/* that
 * holds a package.json. Discovered from the filesystem (mirroring
 * pnpm-workspace.yaml's `apps/*` + `packages/*` globs) so newly-extracted
 * packages are covered automatically without editing this list.
 */
const workspacePackageDirs = (): Array<string> => {
  const dirs: Array<string> = []
  for (const group of ['apps', 'packages']) {
    const groupDir = join(repoRoot, group)
    if (!existsSync(groupDir)) continue
    for (const entry of readdirSync(groupDir)) {
      if (existsSync(join(groupDir, entry, 'package.json'))) {
        dirs.push(join(groupDir, entry))
      }
    }
  }
  return dirs.sort()
}

/** Repo-relative path, so failure messages name the offending package. */
const rel = (path: string) => relative(repoRoot, path)

// The established invocation: apps/web has always used `tsc --noEmit`. Every
// package extends @bcordes/config/tsconfig.base.json and already ships a
// tsconfig.json, so the same bare invocation resolves each package's own
// config. A trailing `-p tsconfig.json` is tolerated, but a `tsc --noEmit` must
// be present.
const TYPECHECK_PATTERN = /\btsc\b.*--noEmit/

describe('workspace typecheck coverage', () => {
  it('discovers every workspace package (sanity: apps/web + all packages/*)', () => {
    const found = workspacePackageDirs().map(rel)

    // A floor guard: if discovery silently returns nothing, the coverage
    // assertions below would vacuously pass. apps/web + 13 packages = 14.
    expect(found).toContain('apps/web')
    expect(found.length).toBeGreaterThanOrEqual(14)
  })

  it('root `typecheck` fans out recursively to every workspace package', () => {
    const root = readJson(join(repoRoot, 'package.json'))

    // `pnpm -r typecheck` is the fan-out. It is only real coverage if every
    // package also declares the script (asserted below); a recursive run skips
    // any package that lacks it.
    expect(root.scripts?.typecheck).toBe('pnpm -r typecheck')
  })

  it('every workspace package.json declares a `typecheck` script', () => {
    const missing = workspacePackageDirs()
      .filter((dir) => !readJson(join(dir, 'package.json')).scripts?.typecheck)
      .map(rel)

    // The acceptance criterion, executed: no package silently skipped from
    // `pnpm -r typecheck`.
    expect(missing).toEqual([])
  })

  it('every `typecheck` script follows the established `tsc --noEmit` pattern', () => {
    const nonConforming = workspacePackageDirs()
      .map((dir) => ({
        pkg: rel(dir),
        script: readJson(join(dir, 'package.json')).scripts?.typecheck as
          | string
          | undefined,
      }))
      .filter(({ script }) => !script || !TYPECHECK_PATTERN.test(script))
      .map(({ pkg }) => pkg)

    expect(nonConforming).toEqual([])
  })
})
