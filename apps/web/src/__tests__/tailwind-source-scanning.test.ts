import { execFileSync } from 'node:child_process'
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

// Tailwind v4 has no `content` array: it discovers class names by scanning the
// sources named by `@source`. Utilities used ONLY inside @bcordes/ui are
// therefore emitted only if apps/web/src/styles.css points Tailwind at that
// package. Drop the directive and the app ships unstyled while every other test
// in this repo still passes — the emitted stylesheet falls from 83,245 bytes to
// 50,552. No unit test can see that; only a real build plus a grep of the
// emitted bundle can. That is what this file does.
//
// Resolved from the path string, not `new URL()`: under jsdom the global URL is
// jsdom's, and fileURLToPath rejects the instance it produces.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const webDir = join(repoRoot, 'apps/web')
const uiSrc = join(repoRoot, 'packages/ui/src')

/**
 * The classes below are assembled from fragments ON PURPOSE — never write one
 * out as a single literal. This file lives under apps/web/src, which Tailwind
 * scans, so a whole class name spelled anywhere in it (code OR comment) becomes
 * a scanned candidate and Tailwind emits the utility no matter where else it is
 * used. That silently defeats the whole file: measured with the directive
 * removed and the names spelled out, the stylesheet lost 32KB of the package's
 * utilities and every assertion below still passed. Split, they generate
 * nothing, and their presence in the bundle can only come from packages/ui.
 */
const cls = (...fragments: Array<string>) => fragments.join('')

/**
 * Utilities used by @bcordes/ui and by nothing in apps/web, so the only route
 * they have into the stylesheet is @source scanning of the package. The first
 * spec keeps that true; without it the rest could pass vacuously.
 */
const SENTINELS = [
  cls('shadow', '-xs'),
  cls('outline', '-hidden'),
  cls('border', '-input'),
  cls('size', '-3.5'),
  cls('aria-invalid', ':ring-destructive', '/20'),
]

/** The selector Tailwind emits for a class — non-word characters escaped. */
const selectorFor = (className: string) =>
  '.' + className.replace(/[^\w-]/g, (char) => `\\${char}`)

function sourceFiles(dir: string): Array<string> {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(tsx?|css|html|mdx?)$/.test(entry) ? [path] : []
  })
}

let bundledCss = ''

describe('tailwind @source scanning of @bcordes/ui', () => {
  beforeAll(() => {
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
      execFileSync('pnpm', ['--filter', 'bcordes', 'build'], {
        cwd: buildRoot,
        env: { ...process.env, NODE_ENV: 'production' },
        stdio: 'pipe',
      })

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
