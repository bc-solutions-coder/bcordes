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
const filesMatching = (pattern: string): Array<string> => {
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
        'apps',
        'packages',
        ':!packages/utils/package.test.ts',
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

/** Preserve at least the original 32 importers while allowing new callers. */
const FORMER_IMPORTER_COUNT = 32

describe('@bcordes/utils package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/utils')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('exports its source entrypoint (no build step, no dist/)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports).toMatchObject({ '.': './src/index.ts' })
    expect(existsSync(join(packageDir, 'src/index.ts'))).toBe(true)
  })

  it('declares the runtime dependencies it actually imports', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies).toMatchObject({
      clsx: expect.any(String),
      'tailwind-merge': expect.any(String),
      'date-fns': expect.any(String),
    })
  })
})

describe('the source really moved out of apps/web', () => {
  it('holds the sources at packages/utils/src', () => {
    expect(existsSync(join(packageDir, 'src/utils.ts'))).toBe(true)
    expect(existsSync(join(packageDir, 'src/format.ts'))).toBe(true)
  })

  it('leaves nothing behind at apps/web/src/lib', () => {
    expect(existsSync(join(webDir, 'src/lib/utils.ts'))).toBe(false)
    expect(existsSync(join(webDir, 'src/lib/format.ts'))).toBe(false)
  })

  it('re-exports cn and the format helpers from its index, and they work', async () => {
    const mod = await import('./src/index')

    expect(mod.cn('p-4', 'p-2')).toBe('p-2')
    expect(typeof mod.formatRelativeTime).toBe('function')
    expect(mod.formatDateTime('2026-01-05T14:30:00Z')).toMatch(/Jan 5, 2026/)
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))

    expect(web.dependencies['@bcordes/utils']).toBe('workspace:*')
  })

  it('takes clsx, tailwind-merge and date-fns off apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))
    const declared = {
      ...web.dependencies,
      ...web.devDependencies,
    }

    expect(declared).not.toHaveProperty('clsx')
    expect(declared).not.toHaveProperty('tailwind-merge')
    expect(declared).not.toHaveProperty('date-fns')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/utils')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it("resolves its '.' export from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/utils'))).toBe(
      realpathSync(join(packageDir, 'src/index.ts')),
    )
  })
})

describe('every importer was rewritten', () => {
  it('leaves no @/lib/utils or @/lib/format import anywhere', () => {
    expect(filesMatching('@/lib/utils')).toEqual([])
    expect(filesMatching('@/lib/format')).toEqual([])
  })

  it('points the shadcn utils alias at the package', () => {
    const components = readJson(join(webDir, 'components.json'))

    expect(components.aliases.utils).toBe('@bcordes/utils')
  })

  it('redirects every former importer to @bcordes/utils', () => {
    const importers = filesMatching("from '@bcordes/utils'")

    expect(importers.length).toBeGreaterThanOrEqual(FORMER_IMPORTER_COUNT)
    expect(importers).toEqual(
      expect.arrayContaining([
        'packages/ui/src/components/button.tsx',
        'apps/web/src/features/projects/components/ProjectCard.tsx',
        'apps/web/src/routes/dashboard/inquiries.$id.tsx',
      ]),
    )
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
            ['exec', 'vitest', 'list', '--json', '--project', '@bcordes/utils'],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual(
        [
          join(packageDir, 'package.test.ts'),
          join(packageDir, 'src/format.test.ts'),
          join(packageDir, 'src/utils.test.ts'),
        ].sort(),
      )
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/utils'),
      ).toBe(true)
    },
  )
})
