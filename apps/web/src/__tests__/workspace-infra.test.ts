import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// These tests use the app tsconfig; the workspace root has none.
// Use a path string because fileURLToPath rejects jsdom's URL instances.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8')

describe('Dockerfile (pnpm workspace aware)', () => {
  const dockerfile = read('Dockerfile')
  const depsStage = dockerfile.split(/^FROM .* AS builder$/m)[0]
  const runtimeStage = dockerfile.split(/^FROM .* AS runtime$/m)[1] ?? ''

  it('copies pnpm-workspace.yaml into the dependency layer', () => {
    expect(depsStage).toMatch(/^COPY .*\bpnpm-workspace\.yaml\b.*$/m)
  })

  it('copies apps/web/package.json before installing', () => {
    const copy = depsStage.match(
      /^COPY apps\/web\/package\.json \.\/apps\/web\/$/m,
    )
    const install = depsStage.match(/^RUN .*pnpm install --frozen-lockfile.*$/m)
    expect(
      copy,
      'apps/web/package.json must be COPYed into the deps stage',
    ).not.toBeNull()
    expect(install).not.toBeNull()
    expect(copy!.index).toBeLessThan(install!.index!)
  })

  it('builds only the bcordes package, not the workspace root', () => {
    expect(dockerfile).toMatch(/^RUN pnpm --filter bcordes build$/m)
  })

  it('runtime stage copies the build output from apps/web/.output', () => {
    expect(runtimeStage).toMatch(
      /^COPY .*--from=builder \/app\/apps\/web\/\.output \.\/\.output$/m,
    )
    expect(runtimeStage).not.toMatch(/--from=builder \/app\/\.output\b/)
  })
})

describe('pnpm --filter bcordes', () => {
  it('resolves to exactly one package: apps/web', () => {
    const out = execFileSync(
      'pnpm',
      ['--filter', 'bcordes', 'list', '--depth', '-1', '--json'],
      { cwd: repoRoot, encoding: 'utf8' },
    )
    const pkgs = JSON.parse(out) as Array<{ name: string; path: string }>
    expect(pkgs).toHaveLength(1)
    expect(pkgs[0].name).toBe('bcordes')
    expect(pkgs[0].path).toBe(join(repoRoot, 'apps/web').replace(/\/$/, ''))
  })
})

describe('CI workflow', () => {
  const ci = read('.github/workflows/ci.yml')

  it('build job builds the bcordes package via the workspace filter', () => {
    expect(ci).toMatch(/run: pnpm --filter bcordes build$/m)
  })

  it('test job still runs the root vitest projects config with coverage', () => {
    expect(ci).toMatch(/run: pnpm vitest run --coverage$/m)
  })

  it('lint job still runs the root lint script', () => {
    expect(ci).toMatch(/run: pnpm lint$/m)
  })

  it('all jobs install with a frozen lockfile', () => {
    expect(ci.match(/run: pnpm install --frozen-lockfile$/gm)).toHaveLength(4)
  })
})

describe('release-please config', () => {
  const config = JSON.parse(read('release-please-config.json'))
  const manifest = JSON.parse(read('.release-please-manifest.json'))

  it('keys on apps/web instead of the repo root', () => {
    expect(Object.keys(config.packages)).toEqual(['apps/web'])
  })

  it('keeps the plain v<version> tag lineage (include-component-in-tag: false)', () => {
    expect(config.packages['apps/web']['include-component-in-tag']).toBe(false)
  })

  it('preserves the existing release-type and bump strategy', () => {
    expect(config.packages['apps/web']).toMatchObject({
      'release-type': 'node',
      'bump-minor-pre-major': true,
      'bump-patch-for-minor-pre-major': true,
    })
  })

  it('manifest tracks apps/web at the current released version', () => {
    expect(manifest).toEqual({
      'apps/web': JSON.parse(read('apps/web/package.json')).version,
    })
  })

  it('CHANGELOG.md lives next to the package it describes', () => {
    expect(existsSync(join(repoRoot, 'apps/web/CHANGELOG.md'))).toBe(true)
    expect(existsSync(join(repoRoot, 'CHANGELOG.md'))).toBe(false)
  })
})

describe('release-please.yml semver parsing', () => {
  it('does not strip on a "-v" component separator', () => {
    const script = read('.github/workflows/release-please.yml')
    expect(script).not.toContain('##*-v')
  })
})
