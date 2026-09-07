import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

// Storybook must discover stories under packages/*/src as well as the app.
// Use a path string because fileURLToPath rejects jsdom's URL instances.
const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '../../../..')
const webDir = join(repoRoot, 'apps/web')
const storybookDir = join(webDir, '.storybook')
const packagesDir = join(repoRoot, 'packages')

const STORY_EXT = /\.stories\.(js|jsx|mjs|ts|tsx)$/

async function loadStorybookConfig(): Promise<{ stories: Array<string> }> {
  const mod = await import(pathToFileURL(join(storybookDir, 'main.ts')).href)
  return mod.default
}

function packageStoryFiles(): Array<string> {
  if (!existsSync(packagesDir)) return []
  return readdirSync(packagesDir).flatMap((pkg) => {
    const src = join(packagesDir, pkg, 'src')
    return existsSync(src) && statSync(src).isDirectory()
      ? storyFilesIn(src)
      : []
  })
}

function storyFilesIn(dir: string): Array<string> {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return storyFilesIn(path)
    return STORY_EXT.test(entry) ? [path] : []
  })
}

describe('Storybook scans package sources', () => {
  it('points the stories glob at packages/*/src', async () => {
    const { stories } = await loadStorybookConfig()

    // Resolve globs relative to .storybook, as Storybook does.
    const scansPackages = stories.some((glob) => {
      const resolved = resolve(storybookDir, glob)
      return resolved.startsWith(packagesDir + '/') && glob.includes('.stories')
    })

    expect(
      scansPackages,
      'apps/web/.storybook/main.ts `stories` only globs the app; add ' +
        "'../../../packages/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)' so " +
        'Storybook discovers stories authored in the workspace packages',
    ).toBe(true)
  })

  it('has at least one discoverable package story file on disk', () => {
    const found = packageStoryFiles()

    expect(
      found.length,
      'no *.stories.* file exists under any packages/*/src — author at least ' +
        'one (e.g. packages/ui/src/components/button.stories.tsx) so the ' +
        'packages glob has something to render and the acceptance criterion ' +
        '("renders at least one story from packages/ui") can be met',
    ).toBeGreaterThan(0)
  })

  it('discovers a packages/ui story specifically', () => {
    const found = packageStoryFiles()
    const fromUi = found.filter((path) =>
      path.startsWith(join(packagesDir, 'ui', 'src') + '/'),
    )

    expect(
      fromUi.length,
      'acceptance names packages/ui specifically: at least one ' +
        'packages/ui/src/**/*.stories.* must exist',
    ).toBeGreaterThan(0)
  })
})
