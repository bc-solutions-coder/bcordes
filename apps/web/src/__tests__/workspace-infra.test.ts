import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

// apps/web/src/__tests__ -> repo root. Repo-level infra assertions live in the
// app's test dir (same convention as workspace-vitest-config.test.ts) because
// the workspace root has no tsconfig to type a root-level test against.
// Resolved from the path string, not `new URL()`: under jsdom the global URL is
// jsdom's, and fileURLToPath rejects the instance it produces.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8')

/**
 * Runs the `Parse semver from tag` step of release-please.yml for real:
 * pulls the step's `run:` script out of the workflow, substitutes the tag
 * expression with a literal tag, executes it under bash with a temp
 * GITHUB_OUTPUT, and returns the key=value pairs the step wrote.
 */
function runSemverStep(tag: string): Record<string, string> {
  const workflow = read('.github/workflows/release-please.yml')
  const step = workflow
    .split(/\n {6}- name: /)
    .find((s) => s.startsWith('Parse semver from tag'))
  if (!step)
    throw new Error('no "Parse semver from tag" step in release-please.yml')

  const body = step.slice(step.indexOf('run: |') + 'run: |'.length)
  const script = body
    .split('\n')
    .map((line) => line.replace(/^ {10}/, ''))
    .join('\n')
    // the only workflow expression in the script is the released tag name
    .replace(/\$\{\{[^}]*\}\}/g, tag)
    .split(/\n {6}- name: /)[0]

  const dir = mkdtempSync(join(tmpdir(), 'semver-step-'))
  tmpDirs.push(dir)
  const outFile = join(dir, 'github_output')
  execFileSync(
    'bash',
    ['-euo', 'pipefail', '-c', `: > "$GITHUB_OUTPUT"\n${script}`],
    {
      env: { ...process.env, GITHUB_OUTPUT: outFile },
    },
  )

  return Object.fromEntries(
    readFileSync(outFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const i = line.indexOf('=')
        return [line.slice(0, i), line.slice(i + 1)]
      }),
  )
}

const tmpDirs: Array<string> = []
afterAll(() =>
  tmpDirs.forEach((d) => rmSync(d, { recursive: true, force: true })),
)

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
    const install = depsStage.match(/^RUN .*pnpm install --frozen-lockfile$/m)
    expect(
      copy,
      'apps/web/package.json must be COPYed into the deps stage',
    ).not.toBeNull()
    expect(install).not.toBeNull()
    expect(copy!.index).toBeLessThan(install!.index!)
  })

  it('copies packages/ before installing (forward-compat with future internal packages)', () => {
    expect(depsStage).toMatch(/^COPY packages\/ \.\/packages\/$/m)
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
  it('parses a plain v<version> tag (the format include-component-in-tag: false cuts)', () => {
    expect(runSemverStep('v0.1.7')).toMatchObject({
      version: '0.1.7',
      major: '0',
      minor: '0.1',
    })
  })

  it('parses a multi-digit plain tag', () => {
    expect(runSemverStep('v1.10.2')).toMatchObject({
      version: '1.10.2',
      major: '1',
      minor: '1.10',
    })
  })

  it('does not strip on a "-v" component separator', () => {
    const script = read('.github/workflows/release-please.yml')
    expect(script).not.toContain('##*-v')
  })
})
