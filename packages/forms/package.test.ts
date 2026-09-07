import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')
const uiDir = join(repoRoot, 'packages/ui')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const readText = (path: string) => readFileSync(path, 'utf8')

/** The public surface of the form primitive (form.tsx's export block). */
const FORM_EXPORTS = [
  'Form',
  'FormControl',
  'FormDescription',
  'FormField',
  'FormItem',
  'FormLabel',
  'FormMessage',
  'useFormField',
]

/** Excludes this test because it quotes forbidden paths; no matches return an empty list. */
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
        ':!packages/forms/package.test.ts',
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

describe('@bcordes/forms package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/forms')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('exports a single barrel entry point, straight from source', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
    })
  })

  it('owns the react-hook-form runtime dep that moved off @bcordes/ui', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.dependencies).toMatchObject({
      '@bcordes/ui': 'workspace:*',
      '@bcordes/utils': 'workspace:*',
      'react-hook-form': expect.any(String),
    })
  })

  it('keeps @hookform/resolvers and zod dev-only', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.devDependencies).toMatchObject({
      '@hookform/resolvers': expect.any(String),
      zod: expect.any(String),
    })
    expect(manifest.dependencies ?? {}).not.toHaveProperty(
      '@hookform/resolvers',
    )
    expect(manifest.dependencies ?? {}).not.toHaveProperty('zod')
  })

  it('takes react as a peer, and owns no theme (no tailwindcss)', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // Use the app's React instance so hooks share one runtime.
    expect(manifest.peerDependencies).toMatchObject({
      react: expect.any(String),
    })
    expect(manifest.peerDependencies ?? {}).not.toHaveProperty('tailwindcss')
    expect(manifest.dependencies ?? {}).not.toHaveProperty('react')
    expect(manifest.dependencies ?? {}).not.toHaveProperty('tailwindcss')
  })
})

describe('the form primitive really moved out of @bcordes/ui', () => {
  it('holds form.tsx and its test at packages/forms/src', () => {
    expect(existsSync(join(packageDir, 'src/form.tsx'))).toBe(true)
    expect(existsSync(join(packageDir, 'src/form.test.tsx'))).toBe(true)
  })

  it('leaves nothing behind under packages/ui/src/components', () => {
    expect(existsSync(join(uiDir, 'src/components/form.tsx'))).toBe(false)
    expect(existsSync(join(uiDir, 'src/components/form.test.tsx'))).toBe(false)
  })

  it('reaches Label cross-package and keeps cn from @bcordes/utils', () => {
    const form = readText(join(packageDir, 'src/form.tsx'))

    expect(form).toMatch(/@bcordes\/ui\/components\/label/)
    expect(form).not.toMatch(/from '\.\/label'/)
    expect(form).toMatch(/from '@bcordes\/utils'/)
  })
})

describe('the stale @bcordes/ui wiring spec and manifest are corrected', () => {
  it('drops react-hook-form and its dev tooling from packages/ui/package.json', () => {
    const ui = readJson(join(uiDir, 'package.json'))

    expect(ui.dependencies ?? {}).not.toHaveProperty('react-hook-form')
    expect(ui.devDependencies ?? {}).not.toHaveProperty('@hookform/resolvers')
    expect(ui.devDependencies ?? {}).not.toHaveProperty('zod')
  })

  it('removes form from the @bcordes/ui package.test.ts component lists', () => {
    const uiSpec = readText(join(uiDir, 'package.test.ts'))

    expect(uiSpec).not.toMatch(/^\s*'form',\s*$/m)
  })

  it('drops the react-hook-form dependency assertion from that spec', () => {
    const uiSpec = readText(join(uiDir, 'package.test.ts'))

    expect(uiSpec).not.toMatch(/'react-hook-form':\s*expect\.any/)
  })
})

describe('the barrel exposes exactly the primitive, no react-hook-form leaks', () => {
  it('re-exports every form symbol from src/index.ts', async () => {
    const mod = await import('./src/index')

    expect(Object.keys(mod).sort()).toEqual(
      expect.arrayContaining(FORM_EXPORTS),
    )
    for (const name of FORM_EXPORTS) {
      expect(mod).toHaveProperty(name)
    }
  })

  it('does not re-export react-hook-form internals through the barrel', async () => {
    const mod = await import('./src/index')
    const keys = Object.keys(mod)

    expect(keys).not.toContain('Controller')
    expect(keys).not.toContain('useForm')
    expect(keys).not.toContain('useFormContext')
    expect(keys).not.toContain('FormProvider')
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))

    expect(web.dependencies['@bcordes/forms']).toBe('workspace:*')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/forms')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it("resolves its '.' export from apps/web", () => {
    const requireFromWeb = createRequire(join(webDir, 'package.json'))

    expect(realpathSync(requireFromWeb.resolve('@bcordes/forms'))).toBe(
      realpathSync(join(packageDir, 'src/index.ts')),
    )
  })
})

describe('every form-primitive importer was rewritten', () => {
  it('leaves no @bcordes/ui/components/form import anywhere', () => {
    expect(filesMatching('@bcordes/ui/components/form')).toEqual([])
  })

  it('redirects the former importers to @bcordes/forms', () => {
    expect(filesMatching('@bcordes/forms')).toEqual(
      expect.arrayContaining([
        'apps/web/src/features/contact/components/ContactFormFields.tsx',
      ]),
    )
  })
})

describe('the package runs in the root vitest', () => {
  it(
    "collects the package's own tests as its own project",
    { timeout: 180_000 },
    () => {
      const collected: Array<{ file: string; projectName: string }> =
        JSON.parse(
          execFileSync(
            'pnpm',
            ['exec', 'vitest', 'list', '--json', '--project', '@bcordes/forms'],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual(
        expect.arrayContaining([
          join(packageDir, 'package.test.ts'),
          join(packageDir, 'src/form.test.tsx'),
        ]),
      )
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/forms'),
      ).toBe(true)
    },
  )
})

describe('SelectFormField really moved into @bcordes/forms', () => {
  it('holds SelectFormField.tsx and its test at packages/forms/src', () => {
    expect(existsSync(join(packageDir, 'src/SelectFormField.tsx'))).toBe(true)
    expect(existsSync(join(packageDir, 'src/SelectFormField.test.tsx'))).toBe(
      true,
    )
  })

  it('leaves nothing behind under apps/web contact', () => {
    expect(
      existsSync(
        join(webDir, 'src/features/contact/components/SelectFormField.tsx'),
      ),
    ).toBe(false)
  })

  it('re-exports SelectFormField and its public types from the barrel', () => {
    const barrel = readText(join(packageDir, 'src/index.ts'))

    expect(barrel).toMatch(
      /export \{ SelectFormField \} from '\.\/SelectFormField'/,
    )
    expect(barrel).toMatch(
      /export type \{ SelectFormFieldProps, SelectOption \} from '\.\/SelectFormField'/,
    )
  })

  it('composes the primitive as a sibling and the Select cross-package', () => {
    const source = readText(join(packageDir, 'src/SelectFormField.tsx'))

    expect(source).toMatch(/from '\.\/form'/)
    expect(source).not.toMatch(/from '@bcordes\/forms'/)
    expect(source).toMatch(/@bcordes\/ui\/components\/select/)
  })

  it('exposes overridable trigger/content class props (the one behaviour change)', () => {
    const source = readText(join(packageDir, 'src/SelectFormField.tsx'))

    expect(source).toMatch(/triggerClassName\?: string/)
    expect(source).toMatch(/contentClassName\?: string/)
  })

  it('has apps/web consume SelectFormField from the package, not a local file', () => {
    const consumer = readText(
      join(webDir, 'src/features/contact/components/ContactFormFields.tsx'),
    )

    expect(consumer).toMatch(
      /import \{[^}]*SelectFormField[^}]*\} from '@bcordes\/forms'/s,
    )
    expect(consumer).not.toMatch(/from '\.\/SelectFormField'/)
  })
})
