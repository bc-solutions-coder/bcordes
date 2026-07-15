import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// These specs verify that @bcordes/ui is a real, wired-up workspace package
// rather than a directory that happens to hold some files: the primitives left
// apps/web for good, pnpm links the package, Node resolves the per-component
// subpath exports from apps/web, every former `@/components/ui/shadcn/*`
// importer now goes through the package, the theme tokens the primitives read
// ship with them, and the package's own tests run in the root vitest.
//
// The BEHAVIOUR of each primitive is specified by the 17 *.test.tsx files that
// moved here alongside the components; they render the real Base UI parts and
// are not re-implemented here.

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')
const oldDir = join(webDir, 'src/components/ui/shadcn')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const readText = (path: string) => readFileSync(path, 'utf8')

/**
 * The primitives that live in packages/ui/src/components/, flattened out of the
 * redundant `ui/shadcn/` nesting.
 *
 * form.tsx is NOT in this list: T4.1 moved it here alongside the rest, but F10
 * (bcordes-0i2.10.1) then extracted it into @bcordes/forms and rewrote its
 * importers off the old ui form subpath, so the form primitive no longer lives
 * in this package.
 */
const COMPONENTS = [
  'avatar',
  'badge',
  'button',
  'card',
  'checkbox',
  'dialog',
  'dropdown-menu',
  'input',
  'label',
  'navigation-menu',
  'popover',
  'progress',
  'select',
  'separator',
  'sheet',
  'skeleton',
  'sonner',
  'spinner',
  'switch',
  'table',
  'tabs',
  'textarea',
  'tooltip',
]

/** The 17 primitives that brought a *.test.tsx with them. */
const TESTED_COMPONENTS = [
  'avatar',
  'badge',
  'button',
  'checkbox',
  'dialog',
  'dropdown-menu',
  'label',
  'navigation-menu',
  'popover',
  'progress',
  'select',
  'separator',
  'sheet',
  'switch',
  'tabs',
  'tooltip',
]

/** Every file outside the moved tree that imported a primitive. */
const FORMER_IMPORTERS = [
  'apps/web/src/components/about/AboutHero.tsx',
  'apps/web/src/components/contact/ContactFormFields.tsx',
  'apps/web/src/components/contact/ContactFormSuccess.tsx',
  // SelectFormField left apps/web for @bcordes/forms in T10.2, but it still
  // composes @bcordes/ui/components/select — so it remains a ui-primitive
  // importer, now at its packages/forms home.
  'packages/forms/src/SelectFormField.tsx',
  'apps/web/src/components/dashboard/NotificationRow.tsx',
  'apps/web/src/components/home/FeaturedWork.tsx',
  'apps/web/src/components/home/Hero.tsx',
  'apps/web/src/components/home/ServicesGrid.tsx',
  'apps/web/src/components/layout/Footer.tsx',
  'apps/web/src/components/layout/Header.tsx',
  'apps/web/src/components/layout/MobileNav.tsx',
  'apps/web/src/components/layout/NotificationBell.tsx',
  'apps/web/src/components/layout/UserMenu.tsx',
  'apps/web/src/components/projects/ProjectCard.tsx',
  'apps/web/src/components/projects/ProjectFilter.tsx',
  'apps/web/src/routes/__root.test.tsx',
  'apps/web/src/routes/dashboard/inquiries.$id.tsx',
  'apps/web/src/routes/dashboard/inquiries.index.tsx',
  'apps/web/src/routes/dashboard/notifications.index.tsx',
  'apps/web/src/routes/dashboard/settings.index.tsx',
  'apps/web/src/routes/projects/$slug.tsx',
  'apps/web/src/routes/resume.test.tsx',
  'apps/web/src/routes/resume.tsx',
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
        ':!packages/ui/package.test.ts',
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

describe('@bcordes/ui package manifest', () => {
  it('declares the workspace package conventions', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    expect(manifest.name).toBe('@bcordes/ui')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.type).toBe('module')
  })

  it('exports every primitive as its own subpath, straight from source', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // A wildcard subpath, not a barrel: importing the whole design system to
    // render one Badge is what a barrel file would cost, and this repo bans
    // them anyway.
    expect(manifest.exports).toMatchObject({
      './components/*': './src/components/*.tsx',
      './styles.css': './src/styles/theme.css',
    })
  })

  it('declares the runtime dependencies the primitives actually import', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // A package declares what it imports rather than leaning on root hoisting.
    // react-hook-form left with form.tsx (now @bcordes/forms), so it is no
    // longer a dependency here.
    expect(manifest.dependencies).toMatchObject({
      '@base-ui/react': expect.any(String),
      'class-variance-authority': expect.any(String),
      'lucide-react': expect.any(String),
      sonner: expect.any(String),
      '@bcordes/utils': 'workspace:*',
    })
  })

  it('takes react and tailwind as peers, not as its own copies', () => {
    const manifest = readJson(join(packageDir, 'package.json'))

    // Two Reacts in one tree breaks hooks outright; two Tailwinds fight over
    // the single generated stylesheet. The app owns both.
    expect(manifest.peerDependencies).toMatchObject({
      react: expect.any(String),
      tailwindcss: expect.any(String),
    })
    expect(manifest.dependencies ?? {}).not.toHaveProperty('react')
    expect(manifest.dependencies ?? {}).not.toHaveProperty('tailwindcss')
  })
})

describe('the primitives really moved out of apps/web', () => {
  it.each(COMPONENTS)('holds %s.tsx at packages/ui/src/components', (name) => {
    expect(existsSync(join(packageDir, `src/components/${name}.tsx`))).toBe(
      true,
    )
  })

  it('leaves nothing behind under apps/web/src/components/ui', () => {
    // A leftover copy would keep `@/components/ui/shadcn/*` resolving and hide
    // a half-finished extraction. The whole `ui/` directory goes: the extra
    // `ui/shadcn/` nesting is exactly the redundancy this bead flattens away.
    expect(existsSync(oldDir)).toBe(false)
    expect(existsSync(join(webDir, 'src/components/ui'))).toBe(false)
  })

  it.each(TESTED_COMPONENTS)('brings %s.test.tsx along with it', (name) => {
    // The behaviour specs travel with the code they specify; leaving them in
    // apps/web would test the app's node_modules copy of the package instead.
    expect(
      existsSync(join(packageDir, `src/components/${name}.test.tsx`)),
    ).toBe(true)
  })

  it('keeps cn coming from @bcordes/utils, not a re-created local copy', () => {
    // T3.1 already put cn in a package; the move must not resurrect a
    // packages/ui/src/utils.ts alongside it.
    expect(existsSync(join(packageDir, 'src/utils.ts'))).toBe(false)
    expect(readText(join(packageDir, 'src/components/button.tsx'))).toMatch(
      /from '@bcordes\/utils'/,
    )
  })
})

describe('the theme tokens ship with the primitives that read them', () => {
  it('defines the :root tokens and the @theme mapping in the package', () => {
    // Every primitive's classes resolve against these (bg-primary, border-border,
    // rounded-lg…). A consumer that installs the package but not the tokens gets
    // unstyled components, so the tokens are part of the package, not the app.
    const theme = readText(join(packageDir, 'src/styles/theme.css'))

    expect(theme).toMatch(/:root\s*\{/)
    expect(theme).toMatch(/--primary:/)
    expect(theme).toMatch(/--border:/)
    expect(theme).toMatch(/@theme inline\s*\{/)
    expect(theme).toMatch(/--color-primary:\s*var\(--primary\)/)
    // The extended tokens documented in CLAUDE.md come too.
    expect(theme).toMatch(/--border-primary:/)
    expect(theme).toMatch(/--color-foreground-secondary:/)
  })

  it('leaves the app stylesheet owning tailwind, fonts and its own animations', () => {
    const styles = readText(join(webDir, 'src/styles.css'))

    // The tokens are gone from here…
    expect(styles).not.toMatch(/--primary:\s*oklch/)
    expect(styles).not.toMatch(/@theme inline/)
    // …but pulled back in, before the @layer base rules that read var(--border)
    // and before Tailwind generates utilities from the @theme mapping.
    expect(styles).toMatch(/@import ['"]@bcordes\/ui\/styles\.css['"]/)
    // and everything that was never a design token stays put.
    expect(styles).toMatch(/@import ['"]tailwindcss['"]/)
    expect(styles).toMatch(/@keyframes/)
    expect(styles).toMatch(/animate-fade-in-up/)
    expect(styles).toMatch(/Outfit/)
  })

  it('leaves showcase.css in the app', () => {
    // It defines no tokens at all — it is markdown/blog presentation for
    // apps/web's showcase pages, and it is not a UI primitive.
    expect(existsSync(join(webDir, 'src/styles/showcase.css'))).toBe(true)
    expect(existsSync(join(packageDir, 'src/styles/showcase.css'))).toBe(false)
  })
})

describe('workspace wiring', () => {
  it('is a workspace: dependency of apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))

    expect(web.dependencies['@bcordes/ui']).toBe('workspace:*')
  })

  it('takes @base-ui/react and class-variance-authority off apps/web', () => {
    const web = readJson(join(webDir, 'package.json'))
    const declared = { ...web.dependencies, ...web.devDependencies }

    // The primitives were their only importers in the whole app; they are the
    // package's dependencies now. lucide-react, sonner and react-hook-form are
    // NOT in this list — the app still imports all three directly.
    expect(declared).not.toHaveProperty('@base-ui/react')
    expect(declared).not.toHaveProperty('class-variance-authority')
  })

  it('is linked into apps/web/node_modules by pnpm install', () => {
    const link = join(webDir, 'node_modules/@bcordes/ui')

    expect(existsSync(link)).toBe(true)
    expect(realpathSync(link)).toBe(realpathSync(packageDir))
  })

  it.each(['button', 'badge', 'label', 'sonner'])(
    "resolves './components/%s' from apps/web through the exports map",
    (name) => {
      const requireFromWeb = createRequire(join(webDir, 'package.json'))

      expect(
        realpathSync(requireFromWeb.resolve(`@bcordes/ui/components/${name}`)),
      ).toBe(realpathSync(join(packageDir, `src/components/${name}.tsx`)))
    },
  )
})

describe('every importer was rewritten', () => {
  it('leaves no @/components/ui import anywhere', () => {
    // The acceptance criterion, executed. It also catches components.json,
    // whose shadcn `ui` alias decides where newly added primitives land — and
    // which is not a .ts file, so nothing else would catch it.
    expect(filesMatching('@/components/ui')).toEqual([])
  })

  it('points the shadcn ui alias at the package', () => {
    const components = readJson(join(webDir, 'components.json'))

    expect(components.aliases.ui).toBe('@bcordes/ui/components')
    // T3.1 already did this one; it must survive.
    expect(components.aliases.utils).toBe('@bcordes/utils')
  })

  it('redirects every former importer to @bcordes/ui/components/*', () => {
    // Named exactly, not counted: this proves the imports were REDIRECTED, not
    // quietly dropped along with whatever they rendered.
    expect(filesMatching('@bcordes/ui/components/')).toEqual(
      expect.arrayContaining(FORMER_IMPORTERS),
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
      // specs must actually run somewhere, not just sit on disk.
      const collected: Array<{ file: string; projectName: string }> =
        JSON.parse(
          execFileSync(
            'pnpm',
            ['exec', 'vitest', 'list', '--json', '--project', '@bcordes/ui'],
            { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
          ),
        )
      const files = [...new Set(collected.map((entry) => entry.file))].sort()

      expect(files).toEqual(
        [
          join(packageDir, 'package.test.ts'),
          ...TESTED_COMPONENTS.map((name) =>
            join(packageDir, `src/components/${name}.test.tsx`),
          ),
        ].sort(),
      )
      expect(
        collected.every((entry) => entry.projectName === '@bcordes/ui'),
      ).toBe(true)
    },
  )

  it('keeps the primitives out of the merged coverage report', () => {
    // Read the config as text: importing the root vitest config in-process
    // drags esbuild into jsdom and throws (see the T1.4 guard for the details).
    const rootConfig = readText(join(repoRoot, 'vitest.config.ts'))

    // The coverage exclude glob was '**/components/ui/shadcn/**'. That path no
    // longer exists, so left alone it silently excludes NOTHING and the
    // primitives start counting toward coverage for no reason anyone chose.
    expect(rootConfig).not.toMatch(/components\/ui\/shadcn/)
    expect(rootConfig).toMatch(/packages\/ui\/src\/components/)
  })
})
