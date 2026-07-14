import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Guards the root Vitest projects config (bcordes-0i2.1.4).
 *
 * The workspace must run as ONE Vitest 3 run: a root config that owns the
 * project list and the single merged coverage report, plus a per-app config
 * that keeps the app's own environment/setupFiles/include. Before this bead the
 * root config still pointed at a root-level `src/` that no longer exists after
 * the move to apps/web, so `pnpm vitest run` at the repo root found NO test
 * files at all and exited 1.
 *
 * Configs are evaluated in a CHILD NODE PROCESS, not imported here: importing a
 * vite/vitest config in-process drags in esbuild, which throws
 * "new TextEncoder().encode('') instanceof Uint8Array is incorrectly false"
 * under the jsdom environment this suite runs in. The child gets a clean Node
 * env (Node 24 strips the TS types natively), so these assertions run against
 * the REAL resolved config objects rather than a regex over the source text.
 *
 * The behavioural checks shell out to `vitest list`, which COLLECTS test files
 * without executing their bodies. That is deliberate: a child `vitest run`
 * would re-enter this very file and recurse forever. The one child that does
 * run with --coverage is pinned to a single unrelated test file and writes to a
 * throwaway reportsDirectory, so it neither recurses nor clobbers ./coverage.
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
const rootConfigPath = join(repoRoot, 'vitest.config.ts')
const appConfigPath = join(appDir, 'vitest.config.ts')

/**
 * The pre-migration baseline recorded in T1.3: 105 test files / 947 tests
 * (941 pre-migration + 6 added by h3-resolution.test.ts). The root run must not
 * silently drop any of them. Tests added after T1.3 (including this file) only
 * push the total up, so the count is asserted as a FLOOR while the file set is
 * asserted EXACTLY against what is on disk.
 */
const BASELINE_TEST_COUNT = 947

interface ResolvedTestConfig {
  environment?: string
  setupFiles?: Array<string> | string
  include?: Array<string>
  projects?: Array<string>
  coverage?: {
    provider?: string
    reporter?: Array<string>
    reportsDirectory?: string
    reportOnFailure?: boolean
    include?: Array<string>
    exclude?: Array<string>
  }
}

const LOAD_CONFIG_SCRIPT = `
import { pathToFileURL } from 'node:url'
const mod = await import(pathToFileURL(process.argv[1]).href)
const cfg =
  typeof mod.default === 'function'
    ? await mod.default({ command: 'serve', mode: 'test' })
    : await mod.default
const plugins = await Promise.all((cfg.plugins ?? []).flat(Infinity))
process.stdout.write(
  JSON.stringify({
    test: cfg.test ?? null,
    pluginNames: plugins.filter(Boolean).map((p) => p.name ?? null),
  }),
)
`

function loadConfig(path: string): {
  test: ResolvedTestConfig | null
  pluginNames: Array<string | null>
} {
  const stdout = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', LOAD_CONFIG_SCRIPT, path],
    { cwd: dirname(path), encoding: 'utf8' },
  )

  return JSON.parse(stdout)
}

/**
 * Deliberately dependency-free: apps/web has no glob library on its own
 * resolution path, and adding one just to list files would reintroduce the
 * undeclared-dependency trap that T1.3 removed.
 */
function testFilesOnDisk(): Array<string> {
  return readdirSync(join(appDir, 'src'), { recursive: true })
    .map(String)
    .filter((file) => /\.test\.tsx?$/.test(file))
    .map((file) => join(appDir, 'src', file))
    .sort()
}

interface CollectedTest {
  name: string
  file: string
  projectName: string
}

let collected: Array<CollectedTest> | undefined

function collectFromRootConfig(): Array<CollectedTest> {
  // Collection is a ~30s child run; every test in this file wants the same
  // answer, so pay for it once.
  if (collected) return collected

  const stdout = execFileSync(
    'pnpm',
    ['exec', 'vitest', 'list', '--json'],
    // cwd = repo root, and NO --config/--root: this must work off the plain
    // root config exactly the way `pnpm test` and CI invoke it.
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )

  collected = JSON.parse(stdout)
  return collected!
}

describe('root vitest.config.ts (workspace projects + merged coverage)', () => {
  it('exists at the repo root', () => {
    expect(existsSync(rootConfigPath)).toBe(true)
  })

  it('declares the workspace projects (apps/* and packages/*)', () => {
    const { test } = loadConfig(rootConfigPath)

    expect(test?.projects).toEqual(
      expect.arrayContaining(['apps/*', 'packages/*']),
    )
  })

  it('delegates app-scoped options to the project, keeping none itself', () => {
    const { test } = loadConfig(rootConfigPath)

    // environment/setupFiles/include belong to apps/web now. Leaving them on the
    // root config is what pointed the whole run at a root `src/` that no longer
    // exists.
    expect(test?.environment).toBeUndefined()
    expect(test?.setupFiles).toBeUndefined()
    expect(test?.include).toBeUndefined()
  })

  it('owns the single merged coverage report', () => {
    const { test } = loadConfig(rootConfigPath)
    const coverage = test?.coverage

    expect(coverage?.provider).toBe('v8')
    expect(coverage?.reporter).toEqual(
      expect.arrayContaining(['text', 'lcov', 'json-summary']),
    )
    expect(coverage?.reportOnFailure).toBe(true)

    // Must resolve to <repoRoot>/coverage — this is what keeps CI and the
    // Codecov badge pointing at the same path they used pre-migration.
    const reportsDirectory = coverage?.reportsDirectory ?? ''
    const resolved = isAbsolute(reportsDirectory)
      ? reportsDirectory
      : resolve(repoRoot, reportsDirectory)

    expect(resolved).toBe(join(repoRoot, 'coverage'))
  })

  it('scopes coverage sources to workspace packages, not a root src/', () => {
    const { test } = loadConfig(rootConfigPath)
    const include = test?.coverage?.include ?? []

    expect(include.some((glob) => glob.startsWith('apps/*/src/'))).toBe(true)
    expect(include.some((glob) => glob.startsWith('packages/*/src/'))).toBe(
      true,
    )

    // The old root-relative glob matches nothing now that the app lives in
    // apps/web, and would silently report 0% coverage.
    expect(include).not.toContain('src/**/*.{ts,tsx}')
  })

  it('keeps tests, stories, generated routes and ui primitives out of coverage', () => {
    const { test } = loadConfig(rootConfigPath)
    const exclude = test?.coverage?.exclude ?? []
    const matches = (needle: string) =>
      exclude.some((glob) => glob.includes(needle))

    expect(matches('.test.')).toBe(true)
    expect(matches('.stories.')).toBe(true)
    expect(matches('routeTree.gen.ts')).toBe(true)
    // shadcn primitives were excluded pre-migration; dropping them would move
    // the coverage number for reasons unrelated to any real change.
    expect(matches('components')).toBe(true)
  })
})

describe('apps/web/vitest.config.ts (the app project)', () => {
  it('exists in the app package', () => {
    expect(existsSync(appConfigPath)).toBe(true)
  })

  it('keeps the app jsdom environment', () => {
    const { test } = loadConfig(appConfigPath)

    expect(test?.environment).toBe('jsdom')
  })

  it('points setupFiles at a file that exists inside apps/web', () => {
    const { test } = loadConfig(appConfigPath)
    const setupFiles = [test?.setupFiles ?? []].flat()

    expect(setupFiles.length).toBeGreaterThan(0)

    for (const setupFile of setupFiles) {
      const resolved = isAbsolute(setupFile)
        ? setupFile
        : resolve(appDir, setupFile)

      expect(resolved.startsWith(appDir)).toBe(true)
      expect(existsSync(resolved)).toBe(true)
    }
  })

  it('has app-relative include globs covering both .ts and .tsx tests', () => {
    const { test } = loadConfig(appConfigPath)
    const include = test?.include ?? []

    expect(include.length).toBeGreaterThan(0)
    // Paths are relative to apps/web now; an `apps/web/` prefix would only
    // resolve from the repo root and matches nothing from the project root.
    for (const glob of include) {
      expect(glob).not.toContain('apps/web')
      expect(isAbsolute(glob)).toBe(false)
    }

    const patterns = include.join(' ')

    expect(patterns).toMatch(/\.test\./)
    expect(patterns).toMatch(/tsx/)

    // That these globs actually match all 105 files on disk is proven for real
    // by the root-run collection test below, not re-implemented here.
  })

  it('keeps the tsconfig-paths plugin that resolves the @/ alias', () => {
    const { pluginNames } = loadConfig(appConfigPath)

    // Without it every `@/…` import in the suite fails to resolve.
    expect(pluginNames).toContain('vite-tsconfig-paths')
  })
})

describe('the root run collects the whole workspace', () => {
  it(
    'discovers every app test file from the repo root with no extra flags',
    { timeout: 180_000 },
    () => {
      // Scoped to the app project: workspace packages under packages/* are
      // projects of their own and bring their own test files to the same run.
      const files = [
        ...new Set(
          collectFromRootConfig()
            .filter((entry) => entry.projectName === 'bcordes')
            .map((entry) => entry.file),
        ),
      ].sort()

      expect(files).toEqual(testFilesOnDisk())
    },
  )

  it(
    'collects each workspace package as a project of its own',
    { timeout: 180_000 },
    () => {
      // packages/* is not a decorative glob: an extracted package's tests must
      // run in the same root `pnpm vitest run` as the app's.
      const packageTests = collectFromRootConfig().filter((entry) =>
        entry.file.startsWith(join(repoRoot, 'packages')),
      )

      expect(packageTests.length).toBeGreaterThan(0)
      expect(
        packageTests.every((entry) => entry.projectName !== 'bcordes'),
      ).toBe(true)
    },
  )

  it(
    'collects at least the pre-migration test baseline',
    { timeout: 180_000 },
    () => {
      expect(collectFromRootConfig().length).toBeGreaterThanOrEqual(
        BASELINE_TEST_COUNT,
      )
    },
  )
})

describe('merged coverage output', () => {
  const reportsDirectories: Array<string> = []

  afterAll(() => {
    for (const dir of reportsDirectories) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it(
    'writes one lcov.info covering apps/web sources',
    { timeout: 180_000 },
    () => {
      const reportsDirectory = mkdtempSync(join(tmpdir(), 'bcordes-coverage-'))
      reportsDirectories.push(reportsDirectory)

      // Pinned to one small, unrelated test file: enough to prove the coverage
      // plumbing resolves workspace sources, without re-running (and re-entering)
      // the whole suite. reportsDirectory is redirected so ./coverage is untouched.
      // It must be a file that stays in apps/web for the whole migration — the
      // lib/ tests it used to point at are being extracted into packages/*.
      execFileSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--coverage',
          '--coverage.reporter=lcov',
          `--coverage.reportsDirectory=${reportsDirectory}`,
          'routes/dashboard/settings.test.tsx',
        ],
        { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' },
      )

      const lcovPath = join(reportsDirectory, 'lcov.info')

      expect(existsSync(lcovPath)).toBe(true)

      const lcov = readFileSync(lcovPath, 'utf8')
      const sourceFiles = [...lcov.matchAll(/^SF:(.*)$/gm)].map(
        (match) => match[1],
      )

      // Sources must be attributed to the app package. A root-relative include
      // glob produces an lcov with no records at all.
      expect(sourceFiles.length).toBeGreaterThan(0)
      expect(
        sourceFiles.some((file) => file.includes(join('apps', 'web', 'src'))),
      ).toBe(true)
    },
  )
})
