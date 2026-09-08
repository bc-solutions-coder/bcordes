import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

// Load configs in Node children to avoid esbuild and jsdom TypedArray incompatibility.
// Use vitest list for discovery; executing this suite in a child would recurse.

const execFileAsync = promisify(execFile)

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

async function loadConfig(path: string): Promise<{
  test: ResolvedTestConfig | null
  pluginNames: Array<string | null>
}> {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--input-type=module', '-e', LOAD_CONFIG_SCRIPT, path],
    { cwd: dirname(path), encoding: 'utf8' },
  )

  return JSON.parse(stdout)
}

// Use filesystem traversal without adding a glob dependency.
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

let collected: Promise<Array<CollectedTest>> | undefined

function collectFromRootConfig(): Promise<Array<CollectedTest>> {
  // Share one asynchronous collection run across assertions while the worker remains available for RPC.
  collected ??= execFileAsync('pnpm', ['exec', 'vitest', 'list', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).then(({ stdout }) => JSON.parse(stdout))
  return collected
}

describe('root vitest.config.ts (workspace projects + merged coverage)', () => {
  it('exists at the repo root', () => {
    expect(existsSync(rootConfigPath)).toBe(true)
  })

  it('declares the workspace projects (apps/* and packages/*)', async () => {
    const { test } = await loadConfig(rootConfigPath)

    expect(test?.projects).toEqual(
      expect.arrayContaining(['apps/*', 'packages/*']),
    )
  })

  it('delegates app-scoped options to the project, keeping none itself', async () => {
    const { test } = await loadConfig(rootConfigPath)

    expect(test?.environment).toBeUndefined()
    expect(test?.setupFiles).toBeUndefined()
    expect(test?.include).toBeUndefined()
  })

  it('owns the single merged coverage report', async () => {
    const { test } = await loadConfig(rootConfigPath)
    const coverage = test?.coverage

    expect(coverage?.provider).toBe('v8')
    expect(coverage?.reporter).toEqual(
      expect.arrayContaining(['text', 'lcov', 'json-summary']),
    )
    expect(coverage?.reportOnFailure).toBe(true)

    // CI reads the merged report from the root coverage directory.
    const reportsDirectory = coverage?.reportsDirectory ?? ''
    const resolved = isAbsolute(reportsDirectory)
      ? reportsDirectory
      : resolve(repoRoot, reportsDirectory)

    expect(resolved).toBe(join(repoRoot, 'coverage'))
  })

  it('scopes coverage sources to workspace packages, not a root src/', async () => {
    const { test } = await loadConfig(rootConfigPath)
    const include = test?.coverage?.include ?? []

    expect(include.some((glob) => glob.startsWith('apps/*/src/'))).toBe(true)
    expect(include.some((glob) => glob.startsWith('packages/*/src/'))).toBe(
      true,
    )

    expect(include).not.toContain('src/**/*.{ts,tsx}')
  })

  it('keeps tests, stories, generated routes and ui primitives out of coverage', async () => {
    const { test } = await loadConfig(rootConfigPath)
    const exclude = test?.coverage?.exclude ?? []
    const matches = (needle: string) =>
      exclude.some((glob) => glob.includes(needle))

    expect(matches('.test.')).toBe(true)
    expect(matches('.stories.')).toBe(true)
    expect(matches('routeTree.gen.ts')).toBe(true)
    expect(matches('components')).toBe(true)
  })
})

describe('apps/web/vitest.config.ts (the app project)', () => {
  it('exists in the app package', () => {
    expect(existsSync(appConfigPath)).toBe(true)
  })

  it('keeps the app jsdom environment', async () => {
    const { test } = await loadConfig(appConfigPath)

    expect(test?.environment).toBe('jsdom')
  })

  it('points setupFiles at a resolvable setup module', async () => {
    const { test } = await loadConfig(appConfigPath)
    const setupFiles = [test?.setupFiles ?? []].flat()

    expect(setupFiles.length).toBeGreaterThan(0)

    // Resolve relative setup paths from the app and package specifiers through its node_modules.
    const requireFromApp = createRequire(join(appDir, 'package.json'))
    for (const setupFile of setupFiles) {
      const resolved = isAbsolute(setupFile)
        ? setupFile
        : setupFile.startsWith('.')
          ? resolve(appDir, setupFile)
          : requireFromApp.resolve(setupFile)

      expect(existsSync(resolved)).toBe(true)
    }
  })

  it('has app-relative include globs covering both .ts and .tsx tests', async () => {
    const { test } = await loadConfig(appConfigPath)
    const include = test?.include ?? []

    expect(include.length).toBeGreaterThan(0)
    // Include globs are relative to apps/web.
    for (const glob of include) {
      expect(glob).not.toContain('apps/web')
      expect(isAbsolute(glob)).toBe(false)
    }

    const patterns = include.join(' ')

    expect(patterns).toMatch(/\.test\./)
    expect(patterns).toMatch(/tsx/)
  })

  it('resolves the @/ alias through the app test configuration', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
        import { createServer } from 'vite'
        const server = await createServer({
          configFile: process.argv[1],
          logLevel: 'silent',
          server: { middlewareMode: true },
        })
        try {
          const resolved = await server.pluginContainer.resolveId(
            '@/features/home',
            process.argv[2],
          )
          process.stdout.write(JSON.stringify(resolved?.id))
        } finally {
          await server.close()
        }
      `,
        appConfigPath,
        join(appDir, 'src/routes/index.tsx'),
      ],
      { cwd: appDir, encoding: 'utf8' },
    )
    expect(JSON.parse(stdout)).toBe(join(appDir, 'src/features/home/index.ts'))
  })
})

describe('the root run collects the whole workspace', () => {
  it(
    'discovers every app test file from the repo root with no extra flags',
    { timeout: 180_000 },
    async () => {
      const files = [
        ...new Set(
          (await collectFromRootConfig())
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
    async () => {
      const packageTests = (await collectFromRootConfig()).filter((entry) =>
        entry.file.startsWith(join(repoRoot, 'packages')),
      )

      expect(packageTests.length).toBeGreaterThan(0)
      expect(
        packageTests.every((entry) => entry.projectName !== 'bcordes'),
      ).toBe(true)
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
    'writes coverage output even when a partial run fails the global thresholds',
    { timeout: 180_000 },
    async () => {
      const reportsDirectory = mkdtempSync(join(tmpdir(), 'bcordes-coverage-'))
      reportsDirectories.push(reportsDirectory)

      // Run one unrelated test to avoid recursion; isolate its report from the parent coverage run.
      await expect(
        execFileAsync(
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
          { cwd: repoRoot, encoding: 'utf8' },
        ),
      ).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('does not meet global threshold'),
      })

      const lcovPath = join(reportsDirectory, 'lcov.info')

      expect(existsSync(lcovPath)).toBe(true)

      const lcov = readFileSync(lcovPath, 'utf8')
      const sourceFiles = [...lcov.matchAll(/^SF:(.*)$/gm)].map(
        (match) => match[1],
      )

      expect(sourceFiles.length).toBeGreaterThan(0)
      expect(
        sourceFiles.some((file) => file.includes(join('apps', 'web', 'src'))),
      ).toBe(true)
    },
  )
})
