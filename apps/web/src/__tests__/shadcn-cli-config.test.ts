import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// See [UI](../../../../docs/ui.md) for shared component setup.
// Use a path string because fileURLToPath rejects jsdom's URL instances.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const webDir = join(repoRoot, 'apps/web')
const uiDir = join(repoRoot, 'packages/ui')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

describe('apps/web components.json', () => {
  const config = readJson(join(webDir, 'components.json'))

  it('points the ui and utils aliases at the workspace packages', () => {
    expect(config.aliases.ui).toBe('@bcordes/ui/components')
    expect(config.aliases.utils).toBe('@bcordes/utils')
  })

  it('leaves the app-local aliases alone', () => {
    expect(config.aliases.components).toBe('@/components')
    expect(config.aliases.lib).toBe('@/lib')
    expect(config.aliases.hooks).toBe('@/hooks')
  })

  it('scaffolds Base UI primitives, not Radix', () => {
    expect(
      config.style,
      'the CLI is run from apps/web, so this style picks the primitive layer: ' +
        'anything but a base-* style scaffolds `radix-ui` imports',
    ).toMatch(/^base-/)
  })

  it('names a stylesheet that exists', () => {
    expect(existsSync(join(webDir, config.tailwind.css))).toBe(true)
  })
})

describe('packages/ui components.json', () => {
  const configPath = join(uiDir, 'components.json')

  it('exists, or the CLI refuses to write into the package at all', () => {
    expect(existsSync(configPath)).toBe(true)
  })

  it('resolves its own components and utils to the packages', () => {
    const config = readJson(configPath)

    expect(config.aliases.ui).toBe('@bcordes/ui/components')
    expect(config.aliases.components).toBe('@bcordes/ui/components')
    expect(config.aliases.utils).toBe('@bcordes/utils')
  })

  it('declares no alias the package does not export', () => {
    const config = readJson(configPath)
    const exports = readJson(join(uiDir, 'package.json')).exports as Record<
      string,
      string
    >

    for (const [name, alias] of Object.entries<string>(config.aliases)) {
      if (!alias.startsWith('@bcordes/ui/')) continue
      const subpath = alias.replace('@bcordes/ui', '.')
      expect(
        Object.keys(exports),
        `the "${name}" alias resolves to ${alias}, which @bcordes/ui does not ` +
          `export — the CLI aborts before writing anything`,
      ).toContain(`${subpath}/*`)
    }
  })

  it('names the theme stylesheet that ships with the primitives', () => {
    const config = readJson(configPath)

    expect(config.tailwind.css).toBe('src/styles/theme.css')
    expect(existsSync(join(uiDir, config.tailwind.css))).toBe(true)
  })

  it('scaffolds Base UI primitives, not Radix', () => {
    expect(readJson(configPath).style).toMatch(/^base-/)
  })
})

describe('the Base UI migration stays undone', () => {
  it.each([
    ['apps/web', webDir],
    ['packages/ui', uiDir],
  ])('%s depends on no Radix package', (_name, dir) => {
    const pkg = readJson(join(dir, 'package.json'))
    const deps = Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    })

    expect(
      deps.filter((d) => d === 'radix-ui' || d.startsWith('@radix-ui/')),
    ).toEqual([])
  })
})
