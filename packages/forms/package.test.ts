import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// These specs verify that @bcordes/forms is a real, wired-up workspace package
// rather than a directory that happens to hold some files: the React Hook Form
// primitive left packages/ui for good, pnpm links the package, Node resolves
// its single '.' barrel from apps/web, every former
// `@bcordes/ui/components/form` importer now goes through @bcordes/forms, the
// barrel exposes exactly the primitive's public surface (no react-hook-form
// re-exports leaking through), and the package's own tests run in the root
// vitest.
//
// Scope note (bcordes-0i2.10.1, T10.1): this task moves ONLY form.tsx (+ its
// test) out of packages/ui and repoints the two `@bcordes/ui/components/form`
// importers at @bcordes/forms. SelectFormField.tsx stays in apps/web for now —
// it is moved into this package and generalized in T10.2 (bcordes-0i2.10.2),
// whose red phase appends the SelectFormField section marked at the bottom of
// this file. The form-primitive assertions here must all be satisfiable by
// T10.1's green alone.
//
// The BEHAVIOUR of the primitive is specified by form.test.tsx, which moves
// here alongside form.tsx and renders the real react-hook-form wiring; it is
// not re-implemented here.

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

/**
 * Tracked + untracked (but not gitignored) files under apps/ and packages/
 * matching `pattern`. git grep exits 1 when nothing matches, which is a valid
 * answer here, not an error.
 *
 * This file is excluded from its own search: it quotes the very import paths it
 * forbids, so without the exclusion it would always report itself as the sole
 * violator. Every other file under apps/ and packages/ is still searched.
 */
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

    // A single '.' entry, unlike @bcordes/ui's './components/*' wildcard:
    // importers write `import { Form } from '@bcordes/forms'`. Workspace
    // packages use src/index.ts as their package entry even though this repo
    // otherwise bans barrels (see @bcordes/query, @bcordes/authz precedent).
    expect(manifest.exports).toMatchObject({
      '.': './src/index.ts',
    })
  })

  it('owns the react-hook-form runtime dep that moved off @bcordes/ui', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // A package declares what it imports rather than leaning on root hoisting.
    // form.tsx imports react-hook-form (Controller/FormProvider/...), Label via
    // @bcordes/ui, and cn via @bcordes/utils.
    expect(manifest.dependencies).toMatchObject({
      '@bcordes/ui': 'workspace:*',
      '@bcordes/utils': 'workspace:*',
      'react-hook-form': expect.any(String),
    })
  })

  it('keeps @hookform/resolvers and zod dev-only', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // These are reached only by form.test.tsx (zodResolver + schema), so they
    // travel with the test as devDependencies, not runtime deps.
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

    // Two Reacts in one tree breaks hooks; the app owns React. The package
    // composes classNames but ships no tokens of its own, so — unlike
    // @bcordes/ui — tailwindcss is neither a peer nor a dep here.
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
    // A leftover copy would keep `@bcordes/ui/components/form` resolving and
    // hide a half-finished extraction.
    expect(existsSync(join(uiDir, 'src/components/form.tsx'))).toBe(false)
    expect(existsSync(join(uiDir, 'src/components/form.test.tsx'))).toBe(false)
  })

  it('reaches Label cross-package and keeps cn from @bcordes/utils', () => {
    // Inside packages/ui, form.tsx imported Label via the sibling `./label`.
    // That sibling does not exist in this package, so it becomes the
    // cross-package `@bcordes/ui/components/label`. cn stays in its package.
    const form = readText(join(packageDir, 'src/form.tsx'))

    expect(form).toMatch(/@bcordes\/ui\/components\/label/)
    expect(form).not.toMatch(/from '\.\/label'/)
    expect(form).toMatch(/from '@bcordes\/utils'/)
  })
})

describe('the stale @bcordes/ui wiring spec and manifest are corrected', () => {
  it('drops react-hook-form and its dev tooling from packages/ui/package.json', () => {
    // form.tsx was @bcordes/ui's only react-hook-form importer, and
    // @hookform/resolvers + zod were reached only by form.test.tsx. All three
    // move with the primitive, or @bcordes/ui declares deps it no longer uses.
    const ui = readJson(join(uiDir, 'package.json'))

    expect(ui.dependencies ?? {}).not.toHaveProperty('react-hook-form')
    expect(ui.devDependencies ?? {}).not.toHaveProperty('@hookform/resolvers')
    expect(ui.devDependencies ?? {}).not.toHaveProperty('zod')
  })

  it('removes form from the @bcordes/ui package.test.ts component lists', () => {
    // packages/ui/package.test.ts's COMPONENTS and TESTED_COMPONENTS arrays
    // still list 'form' as a primitive that lives in packages/ui. Once form.tsx
    // moves out, those entries make @bcordes/ui's own gate red.
    const uiSpec = readText(join(uiDir, 'package.test.ts'))

    expect(uiSpec).not.toMatch(/^\s*'form',\s*$/m)
  })

  it('drops the react-hook-form dependency assertion from that spec', () => {
    // The '@bcordes/ui package manifest' block asserts manifest.dependencies
    // includes 'react-hook-form'; that assertion must go when the dep does.
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

    // The barrel is the form primitive, not a react-hook-form re-export. A
    // leaked Controller/useForm/useFormContext would widen the public surface
    // and pull rhf into every consumer's import graph unintentionally.
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
    // The acceptance criterion, executed: no file may still reach the primitive
    // through its old @bcordes/ui subpath.
    expect(filesMatching('@bcordes/ui/components/form')).toEqual([])
  })

  it('redirects the former importers to @bcordes/forms', () => {
    // Named exactly, not counted: this proves the imports were REDIRECTED, not
    // quietly dropped. ContactFormFields renders the primitive (Form/FormField)
    // and the SelectFormField the package now owns — both from @bcordes/forms.
    // SelectFormField itself moved INTO this package in T10.2, so it reaches the
    // primitive through the sibling './form', not the package name (asserted in
    // the T10.2 block below); it is no longer an external importer here.
    expect(filesMatching('@bcordes/forms')).toEqual(
      expect.arrayContaining([
        'apps/web/src/components/contact/ContactFormFields.tsx',
      ]),
    )
  })
})

describe('the package runs in the root vitest', () => {
  it(
    "collects the package's own tests as its own project",
    { timeout: 180_000 },
    () => {
      // packages/* in the root vitest projects glob is only worth anything if a
      // new package is picked up with no root-side edit at all — and the moved
      // spec must actually run somewhere, not just sit on disk. An
      // arrayContaining floor keeps this green when T10.2 adds
      // SelectFormField.test.tsx to the same project.
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

// ---------------------------------------------------------------------------
// T10.2 (bcordes-0i2.10.2) — SelectFormField moves in and is generalized.
//
// SelectFormField.tsx moves from apps/web into packages/forms/src, the barrel
// gains a SelectFormField export, and its inline bcordes theme classes become
// overridable triggerClassName/contentClassName props (defaulting to today's
// values). The BEHAVIOUR is specified by SelectFormField.test.tsx (rendered rhf
// wiring); these are the structural wiring assertions — the file move, the
// barrel surface, and that the component composes the primitive as a sibling.
// ---------------------------------------------------------------------------

describe('SelectFormField really moved into @bcordes/forms', () => {
  it('holds SelectFormField.tsx and its test at packages/forms/src', () => {
    expect(existsSync(join(packageDir, 'src/SelectFormField.tsx'))).toBe(true)
    expect(existsSync(join(packageDir, 'src/SelectFormField.test.tsx'))).toBe(
      true,
    )
  })

  it('leaves nothing behind under apps/web contact', () => {
    // A leftover copy in apps/web would let the app fork the component instead
    // of consuming the package's, hiding a half-finished move.
    expect(
      existsSync(join(webDir, 'src/components/contact/SelectFormField.tsx')),
    ).toBe(false)
  })

  it('re-exports SelectFormField and its public types from the barrel', () => {
    // The package OWNS SelectFormField now: importers write
    // `import { SelectFormField } from '@bcordes/forms'`, types included.
    const barrel = readText(join(packageDir, 'src/index.ts'))

    expect(barrel).toMatch(
      /export \{ SelectFormField \} from '\.\/SelectFormField'/,
    )
    expect(barrel).toMatch(
      /export type \{ SelectFormFieldProps, SelectOption \} from '\.\/SelectFormField'/,
    )
  })

  it('composes the primitive as a sibling and the Select cross-package', () => {
    // Inside the package, the primitive is reached through the sibling './form'
    // (NOT the package name — that would be a self-import), while the Select
    // building blocks stay in @bcordes/ui. This is what makes the "former
    // importers" spec above legitimately exclude SelectFormField.
    const source = readText(join(packageDir, 'src/SelectFormField.tsx'))

    expect(source).toMatch(/from '\.\/form'/)
    expect(source).not.toMatch(/from '@bcordes\/forms'/)
    expect(source).toMatch(/@bcordes\/ui\/components\/select/)
  })

  it('exposes overridable trigger/content class props (the one behaviour change)', () => {
    // The only generalization: the previously-hardcoded bcordes theme classes
    // become optional overrides, defaulting to today's values so the app renders
    // identically. The prop surface is asserted here; defaults live in the test.
    const source = readText(join(packageDir, 'src/SelectFormField.tsx'))

    expect(source).toMatch(/triggerClassName\?: string/)
    expect(source).toMatch(/contentClassName\?: string/)
  })

  it('has apps/web consume SelectFormField from the package, not a local file', () => {
    // The call sites (ContactFormFields) import SelectFormField by package name,
    // and no sibling './SelectFormField' import survives now that the file left.
    const consumer = readText(
      join(webDir, 'src/components/contact/ContactFormFields.tsx'),
    )

    expect(consumer).toMatch(
      /import \{[^}]*SelectFormField[^}]*\} from '@bcordes\/forms'/s,
    )
    expect(consumer).not.toMatch(/from '\.\/SelectFormField'/)
  })
})
