import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// These specs verify that @bcordes/test-utils is a real, wired-up workspace
// package — not a directory that happens to hold two files. The framework-
// generic harness (the Vitest setup + the renderWithProviders helper) moved out
// of apps/web, pnpm links the package, every render-helper importer now goes
// through '@bcordes/test-utils', the four verbatim setup.ts copies collapse to
// one, all five jsdom Vitest projects point setupFiles at the package, the
// package is a devDependency-only consumer everywhere, and — the acceptance
// criterion — the harness never gains a back-edge on @bcordes/auth or
// @bcordes/wallow (which would invert the dependency graph, since those depend
// on it via their own '/testing' subpaths).

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

/**
 * Tracked + untracked (but not gitignored) files under `scope` matching
 * `pattern`. git grep exits 1 when nothing matches, which is a valid answer
 * here, not an error.
 *
 * This file is excluded from its own search: it quotes the very import paths it
 * forbids, so without the exclusion it would always report itself as a violator
 * and be unsatisfiable by any implementation.
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
        ':!packages/test-utils/package.test.ts',
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
 * A floor, not an exact count: ~17 apps/web test files import the render helper
 * today. A floor proves the imports were REDIRECTED, not quietly dropped,
 * without being brittle as later features relocate some of these files.
 */
const IMPORTER_FLOOR = 15

/** The verbatim setup.ts copies that dedupe into the package's own setup.ts. */
const DUPLICATE_SETUP_FILES = [
  'apps/web/src/test/setup.ts',
  'packages/ui/src/test/setup.ts',
  'packages/forms/src/test/setup.ts',
  'packages/navigation/src/test/setup.ts',
] as const

/** The five jsdom Vitest projects whose setupFiles must repoint at the package. */
const VITEST_CONFIGS = [
  'apps/web/vitest.config.ts',
  'packages/ui/vitest.config.ts',
  'packages/forms/vitest.config.ts',
  'packages/navigation/vitest.config.ts',
  'packages/query/vitest.config.ts',
] as const

/** Every jsdom consumer that must carry test-utils as a devDependency ONLY. */
const DEVDEP_CONSUMERS = [
  'apps/web/package.json',
  'packages/ui/package.json',
  'packages/forms/package.json',
  'packages/navigation/package.json',
  'packages/query/package.json',
] as const

describe('@bcordes/test-utils package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/test-utils')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('exposes the harness as a barrel plus a ./setup subpath (no build step, no dist/)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
      './setup': './src/setup.ts',
    })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
    expect(existsSync(join(packageDir, 'src/setup.ts'))).toBe(true)
    expect(existsSync(join(packageDir, 'src/render.tsx'))).toBe(true)
  })

  it('ships the testing-library + jsdom harness as runtime dependencies', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // The barrel re-exports @testing-library/react and the setup pulls
    // jest-dom, so these are the package's own runtime surface, not devDeps.
    expect(manifest.dependencies).toMatchObject({
      '@testing-library/react': expect.any(String),
      '@testing-library/dom': expect.any(String),
      '@testing-library/jest-dom': expect.any(String),
      jsdom: expect.any(String),
    })
  })

  it('owns the workspace render-provider deps it wraps', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // Per the plan/design dependency graph tier4: test-utils -> {ui, query}.
    expect(manifest.dependencies['@bcordes/query']).toBe('workspace:*')
    expect(manifest.dependencies['@bcordes/ui']).toBe('workspace:*')
  })
})

describe('no dependency inversion: test-utils never depends on its consumers', () => {
  it('names neither @bcordes/auth nor @bcordes/wallow in its manifest', () => {
    // The acceptance criterion, executed. auth/wallow ship their mocks behind
    // their own /testing subpaths and depend on the harness; a back-edge here
    // would close a cycle.
    const manifestText = readFileSync(join(packageDir, 'package.json'), 'utf8')
    expect(manifestText).not.toMatch(/@bcordes\/(auth|wallow)/)
  })

  it('imports nothing from @bcordes/auth or @bcordes/wallow in its source', () => {
    // Match import syntax, not prose: the barrel's own comment names the
    // packages' /testing subpaths to explain why they stay out, and that
    // explanation must not be read as a violation.
    expect(
      filesMatching("from '@bcordes/auth", ['packages/test-utils']),
    ).toEqual([])
    expect(
      filesMatching("from '@bcordes/wallow", ['packages/test-utils']),
    ).toEqual([])
  })
})

describe("the '.' barrel exposes the generic harness surface", () => {
  it('re-exports renderWithProviders and the testing-library surface', async () => {
    const mod = await import('./src/index')

    expect(typeof mod.renderWithProviders).toBe('function')
    // export * from '@testing-library/react' brings the query/act helpers with
    // it, so consumers import everything from one place.
    expect(Object.keys(mod)).toEqual(
      expect.arrayContaining([
        'renderWithProviders',
        'render',
        'screen',
        'fireEvent',
        'waitFor',
      ]),
    )
  })

  it('keeps app-specific mock fixtures OUT of the generic barrel', async () => {
    const mod = await import('./src/index')
    const keys = Object.keys(mod)

    // The auth/wallow mock factories are app-specific and live behind their own
    // packages' /testing subpaths — they must not have been dragged in here.
    expect(keys).not.toContain('createMockWallowClient')
    expect(keys).not.toContain('createMockAuthSession')
    expect(keys).not.toContain('mockUser')
  })
})

describe('the generic harness really moved out of apps/web', () => {
  it('leaves no render helper behind under apps/web/src/test', () => {
    // A leftover copy would keep @/test/helpers/render resolving and hide a
    // half-done extraction.
    expect(existsSync(join(webDir, 'src/test/helpers/render.tsx'))).toBe(false)
  })

  it('leaves no setup harness behind under apps/web/src/test', () => {
    expect(existsSync(join(webDir, 'src/test/setup.ts'))).toBe(false)
  })
})

describe('the four verbatim setup.ts copies collapse into the package', () => {
  it('deletes every duplicated per-project setup.ts', () => {
    for (const file of DUPLICATE_SETUP_FILES) {
      expect(existsSync(join(repoRoot, file))).toBe(false)
    }
  })

  it('keeps the package as the single home of the setup harness', () => {
    // packages/query's simpler setup.ts also repoints (see VITEST_CONFIGS), so
    // after the move the only src/test/setup.ts left in the tree is gone
    // entirely and the harness lives at packages/test-utils/src/setup.ts.
    expect(existsSync(join(packageDir, 'src/setup.ts'))).toBe(true)
    expect(filesMatching('src/test/setup', ['apps', 'packages'])).toEqual([])
  })
})

describe('every render-helper importer was repointed', () => {
  it('leaves no @/test/helpers/render import anywhere', () => {
    expect(filesMatching('@/test/helpers/render')).toEqual([])
  })

  it('redirects former importers to @bcordes/test-utils', () => {
    const importers = filesMatching("from '@bcordes/test-utils'")

    expect(importers.length).toBeGreaterThanOrEqual(IMPORTER_FLOOR)
    // A few stable call sites no later feature relocates.
    expect(importers).toEqual(
      expect.arrayContaining([
        'apps/web/src/components/contact/ContactForm.test.tsx',
        'apps/web/src/components/layout/NotificationBell.test.tsx',
        'apps/web/src/components/projects/ProjectCard.test.tsx',
        'apps/web/src/routes/dashboard/settings.index.test.tsx',
      ]),
    )
  })
})

describe('every jsdom Vitest project loads setup from the package', () => {
  it('repoints all five setupFiles at @bcordes/test-utils/setup', () => {
    for (const config of VITEST_CONFIGS) {
      const text = readFileSync(join(repoRoot, config), 'utf8')
      expect(text).toMatch(/@bcordes\/test-utils\/setup/)
      // The old app/package-local relative path is gone.
      expect(text).not.toMatch(/\.\/src\/test\/setup/)
    }
  })
})

describe('the harness is a devDependency-only consumer everywhere', () => {
  it('is added under devDependencies (never dependencies) of each jsdom consumer', () => {
    for (const consumer of DEVDEP_CONSUMERS) {
      const manifest = readJson(join(repoRoot, consumer))
      expect(manifest.devDependencies?.['@bcordes/test-utils']).toBe(
        'workspace:*',
      )
      expect(manifest.dependencies?.['@bcordes/test-utils']).toBeUndefined()
    }
  })

  it('is not pulled into the node-env leaf packages', () => {
    // Leaf packages (auth/wallow/authz/server/utils/logger/valkey/config) run
    // environment:'node' with no setupFiles — they must not gain the dep.
    expect(
      filesMatching('@bcordes/test-utils', [
        'packages/auth',
        'packages/wallow',
        'packages/authz',
        'packages/server',
        'packages/utils',
        'packages/logger',
        'packages/valkey',
        'packages/config',
      ]),
    ).toEqual([])
  })
})

describe('workspace wiring', () => {
  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/test-utils')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it("resolves its '.' export from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/test-utils'))).toBe(
      realpathSync(join(packageDir, 'src/index.ts')),
    )
  })

  it("resolves its './setup' subpath from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(
      realpathSync(requireFromWeb.resolve('@bcordes/test-utils/setup')),
    ).toBe(realpathSync(join(packageDir, 'src/setup.ts')))
  })
})
