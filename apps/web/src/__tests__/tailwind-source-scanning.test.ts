import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

// Build the app to check that src/app/styles.css includes utilities from packages/ui.
// Use a path string because fileURLToPath rejects jsdom's URL instances.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const webDir = join(repoRoot, 'apps/web')
const uiSrc = join(repoRoot, 'packages/ui/src')

// Keep sentinel class names split, including in comments, because Tailwind scans this file.
// Whole names here would make the build checks pass even without package scanning.
const cls = (...fragments: Array<string>) => fragments.join('')

// Sentinels must occur only in packages/ui; the first test checks that constraint.
const SENTINELS = [
  cls('shadow', '-xs'),
  cls('outline', '-hidden'),
  cls('border', '-input'),
  cls('size', '-3.5'),
  cls('aria-invalid', ':ring-destructive', '/20'),
]

// Escape non-word characters to match emitted CSS selectors.
const selectorFor = (className: string) =>
  '.' + className.replace(/[^\w-]/g, (char) => `\\${char}`)

function sourceFiles(dir: string): Array<string> {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(tsx?|css|html|mdx?)$/.test(entry) ? [path] : []
  })
}

const execFileAsync = promisify(execFile)
let bundledCss = ''

describe('tailwind @source scanning of @bcordes/ui', () => {
  beforeAll(async () => {
    const buildRoot = mkdtempSync(join(tmpdir(), 'bcordes-css-build-'))
    const excluded = new Set([
      'node_modules',
      '.output',
      '.nitro',
      '.tanstack',
      'dist',
      'coverage',
      'test-results',
      'playwright-report',
    ])
    try {
      for (const entry of [
        'package.json',
        'pnpm-workspace.yaml',
        'apps',
        'packages',
      ]) {
        cpSync(join(repoRoot, entry), join(buildRoot, entry), {
          recursive: true,
          filter: (path) =>
            !excluded.has(basename(path)) && !basename(path).startsWith('.env'),
        })
      }
      for (const entry of [
        '',
        'apps/web',
        ...readdirSync(join(repoRoot, 'packages')).map(
          (name) => `packages/${name}`,
        ),
      ]) {
        const dependencies = join(repoRoot, entry, 'node_modules')
        if (existsSync(dependencies)) {
          symlinkSync(
            dependencies,
            join(buildRoot, entry, 'node_modules'),
            'dir',
          )
        }
      }
      await execFileAsync(
        process.execPath,
        [join(webDir, 'node_modules/vite/bin/vite.js'), 'build'],
        {
          cwd: join(buildRoot, 'apps/web'),
          env: { ...process.env, NODE_ENV: 'production' },
        },
      )

      const assets = join(buildRoot, 'apps/web/.output/public/assets')
      const css = readdirSync(assets).filter((f) => f.endsWith('.css'))
      expect(css.length).toBeGreaterThan(0)
      bundledCss = css
        .map((f) => readFileSync(join(assets, f), 'utf8'))
        .join('\n')
    } finally {
      rmSync(buildRoot, { recursive: true, force: true })
    }
  }, 300_000)

  it('sentinels reach the build only through packages/ui', () => {
    const uiSources = sourceFiles(uiSrc).map((f) => readFileSync(f, 'utf8'))
    const webSources = sourceFiles(join(webDir, 'src')).map((f) =>
      readFileSync(f, 'utf8'),
    )

    for (const sentinel of SENTINELS) {
      expect(
        uiSources.filter((s) => s.includes(sentinel)).length,
        `${sentinel} should be used by @bcordes/ui`,
      ).toBeGreaterThan(0)
      expect(
        webSources.filter((s) => s.includes(sentinel)).length,
        `${sentinel} is spelled out somewhere under apps/web/src — Tailwind ` +
          `scans that, so the utility now gets emitted whether or not the ` +
          `package is scanned, and these specs prove nothing. Split the name ` +
          `into fragments (see cls above) or choose another sentinel.`,
      ).toBe(0)
    }
  })

  it('emits the utilities that only @bcordes/ui uses', () => {
    for (const sentinel of SENTINELS) {
      expect(
        bundledCss,
        `${selectorFor(sentinel)} is missing from the built stylesheet: the ` +
          `@source directive for packages/ui is gone, so every class used only ` +
          `by the primitives was tree-shaken and the app renders unstyled`,
      ).toContain(selectorFor(sentinel))
    }
  })

  it('declares @source for the packages/ui sources', () => {
    const styles = readFileSync(join(webDir, 'src/app/styles.css'), 'utf8')
    const sources = [...styles.matchAll(/@source\s+['"]([^'"]+)['"]/g)].map(
      ([, path]) => resolve(webDir, 'src/app', path),
    )

    expect(sources).toContain(uiSrc)
    expect(existsSync(uiSrc)).toBe(true)
  })
})
