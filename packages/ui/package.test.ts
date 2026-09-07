import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageDir, '../..')
const webDir = join(repoRoot, 'apps/web')
const oldDir = join(webDir, 'src/components/ui/shadcn')

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const readText = (path: string) => readFileSync(path, 'utf8')

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

const FORMER_IMPORTERS = [
  'apps/web/src/features/about/components/AboutHero.tsx',
  'apps/web/src/features/contact/components/ContactFormFields.tsx',
  'apps/web/src/features/contact/components/ContactFormSuccess.tsx',
  'packages/forms/src/SelectFormField.tsx',
  'apps/web/src/features/notifications/components/NotificationRow.tsx',
  'apps/web/src/features/home/components/FeaturedWork.tsx',
  'apps/web/src/features/home/components/Hero.tsx',
  'apps/web/src/features/home/components/ServicesGrid.tsx',
  'apps/web/src/app/components/layout/Footer.tsx',
  'apps/web/src/app/components/layout/Header.tsx',
  'apps/web/src/app/components/layout/MobileNav.tsx',
  'apps/web/src/features/notifications/components/NotificationBell.tsx',
  'apps/web/src/app/components/layout/UserMenu.tsx',
  'apps/web/src/features/projects/components/ProjectCard.tsx',
  'apps/web/src/features/projects/components/ProjectFilter.tsx',
  'apps/web/src/routes/dashboard/inquiries.$id.tsx',
  'apps/web/src/routes/dashboard/inquiries.index.tsx',
  'apps/web/src/routes/dashboard/notifications.index.tsx',
  'apps/web/src/routes/dashboard/settings.index.tsx',
  'apps/web/src/routes/projects/$slug.tsx',
  'apps/web/src/routes/resume.test.tsx',
  'apps/web/src/routes/resume.tsx',
]

/** Search tracked and nonignored untracked files, excluding this file
 * because its assertions contain the forbidden paths. */
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
    expect(manifest.exports).toMatchObject({
      './components/*': './src/components/*.tsx',
      './styles.css': './src/styles/theme.css',
    })
  })

  it('declares the runtime dependencies the primitives actually import', () => {
    const manifest = readJson(join(packageDir, 'package.json'))
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
    expect(existsSync(oldDir)).toBe(false)
    expect(existsSync(join(webDir, 'src/components/ui'))).toBe(false)
  })

  it.each(TESTED_COMPONENTS)('brings %s.test.tsx along with it', (name) => {
    expect(
      existsSync(join(packageDir, `src/components/${name}.test.tsx`)),
    ).toBe(true)
  })

  it('keeps cn coming from @bcordes/utils, not a re-created local copy', () => {
    expect(existsSync(join(packageDir, 'src/utils.ts'))).toBe(false)
    expect(readText(join(packageDir, 'src/components/button.tsx'))).toMatch(
      /from '@bcordes\/utils'/,
    )
  })
})

describe('the theme tokens ship with the primitives that read them', () => {
  it('defines the :root tokens and the @theme mapping in the package', () => {
    const theme = readText(join(packageDir, 'src/styles/theme.css'))

    expect(theme).toMatch(/:root\s*\{/)
    expect(theme).toMatch(/--primary:/)
    expect(theme).toMatch(/--border:/)
    expect(theme).toMatch(/@theme inline\s*\{/)
    expect(theme).toMatch(/--color-primary:\s*var\(--primary\)/)
    expect(theme).toMatch(/--border-primary:/)
    expect(theme).toMatch(/--color-foreground-secondary:/)
  })

  it('leaves the app stylesheet owning tailwind, fonts and its own animations', () => {
    const styles = readText(join(webDir, 'src/app/styles.css'))
    expect(styles).not.toMatch(/--primary:\s*oklch/)
    expect(styles).not.toMatch(/@theme inline/)
    expect(styles).toMatch(/@import ['"]@bcordes\/ui\/styles\.css['"]/)
    expect(styles).toMatch(/@import ['"]tailwindcss['"]/)
    expect(styles).toMatch(/@keyframes/)
    expect(styles).toMatch(/animate-fade-in-up/)
    expect(styles).toMatch(/Outfit/)
  })

  it('leaves showcase.css in the app', () => {
    expect(existsSync(join(webDir, 'src/app/styles/showcase.css'))).toBe(true)
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
    expect(filesMatching('@/components/ui')).toEqual([])
  })

  it('points the shadcn ui alias at the package', () => {
    const components = readJson(join(webDir, 'components.json'))

    expect(components.aliases.ui).toBe('@bcordes/ui/components')
    expect(components.aliases.utils).toBe('@bcordes/utils')
  })

  it('redirects every former importer to @bcordes/ui/components/*', () => {
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
    // Importing the config here loads esbuild into jsdom and throws.
    const rootConfig = readText(join(repoRoot, 'vitest.config.ts'))
    expect(rootConfig).not.toMatch(/components\/ui\/shadcn/)
    expect(rootConfig).toMatch(/packages\/ui\/src\/components/)
  })
})
