import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')
const tscBin = join(repoRoot, 'node_modules/.bin/tsc')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

describe('@bcordes/config package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/config')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('exports the Oxlint plugin and the tsconfig base, and both files exist', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports).toMatchObject({
      './oxlint-plugin': './oxlint-plugin.js',
      './tsconfig.base.json': './tsconfig.base.json',
    })
    expect(existsSync(join(packageDir, 'oxlint-plugin.js'))).toBe(true)
    expect(existsSync(join(packageDir, 'tsconfig.base.json'))).toBe(true)
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of the repo root', () => {
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

    expect(
      realpathSync(requireFromWeb.resolve('@bcordes/config/oxlint-plugin')),
    ).toBe(realpathSync(join(packageDir, 'oxlint-plugin.js')))
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

    expect(resolved.compilerOptions).toMatchObject({
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      jsx: 'react-jsx',
      moduleResolution: 'bundler',
      skipLibCheck: true,
    })

    expect(resolved.compilerOptions.paths['@/*']).toEqual(['./src/*'])
  })
})
