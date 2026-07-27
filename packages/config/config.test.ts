import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// These specs verify that @bcordes/config is a real, wired-up workspace
// package: pnpm links it, Node resolves its export subpaths, tsc inherits its
// compiler options through the exports map, and eslint serves the shared
// module-boundary rules from it. They are the template for the 11 package
// extractions that follow, so they assert wiring, not file contents.

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')
const eslintBin = join(repoRoot, 'node_modules/.bin/eslint')
const tscBin = join(repoRoot, 'node_modules/.bin/tsc')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

/** Every `no-restricted-imports` group eslint applies to `filePath`, flattened. */
const restrictedImportGroups = (filePath: string): Array<string> => {
  const config = JSON.parse(
    execFileSync(eslintBin, ['--print-config', filePath], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  )
  const rule = config.rules?.['no-restricted-imports']
  if (!Array.isArray(rule)) return []
  const options = rule[1] as { patterns?: Array<{ group?: Array<string> }> }
  return (options.patterns ?? []).flatMap((pattern) => pattern.group ?? [])
}

describe('@bcordes/config package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/config')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('exports the eslint config and the tsconfig base, and both files exist', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports).toMatchObject({
      './eslint': './eslint.js',
      './tsconfig.base.json': './tsconfig.base.json',
    })
    expect(existsSync(join(packageDir, 'eslint.js'))).toBe(true)
    expect(existsSync(join(packageDir, 'tsconfig.base.json'))).toBe(true)
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of the repo root (root eslint.config.js imports it)', () => {
    const root = readJson(join(repoRoot, 'package.json'))

    expect(root.devDependencies['@bcordes/config']).toBe('workspace:*')
  })

  it('is a workspace: dependency of apps/web (its tsconfig extends it)', () => {
    const web = readJson(join(webDir, 'package.json'))

    expect(web.devDependencies['@bcordes/config']).toBe('workspace:*')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/config')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it('resolves its export subpaths from apps/web', () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/config/eslint'))).toBe(
      realpathSync(join(packageDir, 'eslint.js')),
    )
    expect(
      realpathSync(
        requireFromWeb.resolve('@bcordes/config/tsconfig.base.json'),
      ),
    ).toBe(realpathSync(join(packageDir, 'tsconfig.base.json')))
  })
})

describe('tsconfig base', () => {
  it('holds the shared compiler options and not the app-specific alias', () => {
    const base = readJson(join(packageDir, 'tsconfig.base.json'))

    expect(base.compilerOptions).toMatchObject({
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      moduleResolution: 'bundler',
      noEmit: true,
    })
    // baseUrl/paths are app-specific and stay in apps/web/tsconfig.json.
    expect(base.compilerOptions.paths).toBeUndefined()
    expect(base.compilerOptions.baseUrl).toBeUndefined()
  })

  it('is what apps/web extends', () => {
    const web = readJson(join(webDir, 'tsconfig.json'))

    expect(web.extends).toBe('@bcordes/config/tsconfig.base.json')
  })

  it('feeds apps/web its compiler options through the exports map (tsc --showConfig)', () => {
    const resolved = JSON.parse(
      execFileSync(
        tscBin,
        ['-p', join(webDir, 'tsconfig.json'), '--showConfig'],
        {
          cwd: webDir,
          encoding: 'utf8',
        },
      ),
    )

    // Inherited from the base...
    expect(resolved.compilerOptions).toMatchObject({
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      jsx: 'react-jsx',
      moduleResolution: 'bundler',
      skipLibCheck: true,
    })
    // ...while the app keeps its own @/ alias.
    expect(resolved.compilerOptions.paths['@/*']).toEqual(['./src/*'])
  })
})

describe('eslint config', () => {
  it('is sourced from @bcordes/config/eslint by the root eslint.config.js', () => {
    const rootConfig = readFileSync(join(repoRoot, 'eslint.config.js'), 'utf8')

    expect(rootConfig).toMatch(/from ['"]@bcordes\/config\/eslint['"]/)
  })

  it(
    'still applies the app module-boundary rules to the app shell, features and shared',
    { timeout: 30_000 },
    () => {
      const appShell = restrictedImportGroups(
        'apps/web/src/app/components/layout/Header.tsx',
      )
      expect(appShell).toContain('~/*')
      expect(appShell).toContain('@/routes/*')

      const feature = restrictedImportGroups(
        'apps/web/src/features/about/components/AboutHero.tsx',
      )
      expect(feature).toEqual(
        expect.arrayContaining([
          '@/routes/*',
          '@/features/*/*',
          '@/shared/*/*',
          '@/app/*/*',
        ]),
      )

      const shared = restrictedImportGroups(
        'apps/web/src/shared/motion/index.ts',
      )
      expect(shared).toContain('@/routes/*')
    },
  )

  it(
    'applies package-level boundaries to packages/',
    { timeout: 30_000 },
    () => {
      // @bcordes/auth must not import @bcordes/ui.
      const auth = restrictedImportGroups('packages/auth/src/session.ts')
      expect(auth.some((group) => group.startsWith('@bcordes/ui'))).toBe(true)

      // Nothing, in any workspace package or app, may reach into another
      // package's internals: only declared export subpaths are importable.
      const deepImport = (groups: Array<string>) =>
        groups.some(
          (group) => group.startsWith('@bcordes/') && group.includes('/src'),
        )
      expect(
        deepImport(restrictedImportGroups('packages/ui/src/button.tsx')),
      ).toBe(true)
      expect(
        deepImport(restrictedImportGroups('apps/web/src/lib/thing.ts')),
      ).toBe(true)
    },
  )
})
