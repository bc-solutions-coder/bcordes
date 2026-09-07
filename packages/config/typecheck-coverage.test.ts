import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Recursive typecheck skips packages without a typecheck script.
const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

/** Match pnpm-workspace.yaml so new packages enter the check automatically. */
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

const TYPECHECK_PATTERN = /\btsc\b.*--noEmit/

describe('workspace typecheck coverage', () => {
  it('discovers every workspace package (sanity: apps/web + all packages/*)', () => {
    const found = workspacePackageDirs().map(rel)

    expect(found).toContain('apps/web')
    expect(found.length).toBeGreaterThanOrEqual(14)
  })

  it('root `typecheck` fans out recursively to every workspace package', () => {
    const root = readJson(join(repoRoot, 'package.json'))

    expect(root.scripts?.typecheck).toBe('pnpm -r typecheck')
  })

  it('every workspace package.json declares a `typecheck` script', () => {
    const missing = workspacePackageDirs()
      .filter((dir) => !readJson(join(dir, 'package.json')).scripts?.typecheck)
      .map(rel)

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
