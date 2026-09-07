import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Checks module boundaries, ESLint rules and the documented directory layout.
// See [Development](../../../../docs/development.md) for module ownership.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

const hasClaude = existsSync(join(repoRoot, 'CLAUDE.md'))
const CLAUDE = hasClaude
  ? readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8')
  : ''
const README = readFileSync(join(repoRoot, 'README.md'), 'utf8')

const section = (doc: string, heading: string): string => {
  const start = doc.indexOf(heading)
  if (start === -1) return ''
  const rest = doc.slice(start + heading.length)
  const level = heading.match(/^#+/)?.[0] ?? '##'
  const end = rest.indexOf(`\n${level} `)
  return end === -1 ? rest : rest.slice(0, end)
}

const keyDirs = section(CLAUDE, '### Key Directories')
const projectStructure = section(README, '## Project structure')

const REMOVED_DIRS = [
  'components/home',
  'components/about',
  'components/projects',
  'components/contact',
  'components/dashboard',
  'server-fns',
  'content',
  'hooks',
  'components/shared',
  'components',
  'config',
  'lib',
  'styles',
]

// Check retained code as well as removed paths to catch accidental deletion.
const EXPECTED_PATHS = [
  'app/index.ts',
  'app/components/layout',
  'app/config/navigation.ts',
  'app/lib/web-vitals.ts',
  'app/styles.css',
  'shared/motion/index.ts',
]

describe('dissolved horizontal directories are removed', () => {
  it.each(REMOVED_DIRS)('apps/web/src/%s no longer exists', (rel) => {
    expect(
      existsSync(join(appSrc, rel)),
      `apps/web/src/${rel} must be removed after the migration`,
    ).toBe(false)
  })

  it('config/inquiries.ts is gone (moved into features/inquiries)', () => {
    expect(existsSync(join(appSrc, 'config/inquiries.ts'))).toBe(false)
  })

  it('the top-level styles.css is gone (moved to app/styles.css)', () => {
    expect(existsSync(join(appSrc, 'styles.css'))).toBe(false)
  })
})

describe('relocated app/ and shared/motion surface exists', () => {
  it.each(EXPECTED_PATHS)('apps/web/src/%s exists', (rel) => {
    expect(
      existsSync(join(appSrc, rel)),
      `apps/web/src/${rel} must exist — the flatten relocates, it does not delete`,
    ).toBe(true)
  })
})

const SKIP_DIRS = new Set([
  'node_modules',
  '.output',
  'dist',
  'coverage',
  '.git',
])

function collectSources(dir: string, acc: Array<string> = []): Array<string> {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSources(full, acc)
    } else if (
      (full.endsWith('.ts') || full.endsWith('.tsx')) &&
      !full.endsWith('routeTree.gen.ts') &&
      full !== selfPath
    ) {
      acc.push(full)
    }
  }
  return acc
}

const allSources = [
  ...collectSources(appSrc),
  ...collectSources(join(repoRoot, 'packages')),
]

// Require an import or mock prefix to avoid matching assertion strings.
const LEAD = String.raw`(?:from|import|vi\.mock|require)\s*\(?\s*['"]`

// Keep paths split to avoid matching this test in sibling source scans.
const STALE_SPECIFIERS = [
  ['@/components', 'home'].join('/'),
  ['@/components', 'about'].join('/'),
  ['@/components', 'projects'].join('/'),
  ['@/components', 'contact'].join('/'),
  ['@/components', 'dashboard'].join('/'),
  ['@/content', 'projects'].join('/'),
  ['@/server-fns', 'inquiries'].join('/'),
  ['@/server-fns', 'notifications'].join('/'),
  ['@/server-fns', 'auth'].join('/'),
  ['@/config', 'inquiries'].join('/'),
  ['@/lib', 'notifications'].join('/'),
  ['@/hooks', 'useUser'].join('/'),
  ['@/components', 'layout'].join('/'),
  ['@/config', 'navigation'].join('/'),
  ['@/lib', 'web-vitals'].join('/'),
  ['@/hooks', 'useReducedMotion'].join('/'),
  ['@/hooks', 'useScrollAnimation'].join('/'),
  ['@/components', 'shared'].join('/'),
  ['@/hooks', 'use-mobile'].join('/'),
]

// Match a quoted module path or one of its descendants.
const staleImportRe = new RegExp(
  `${LEAD}(?:${STALE_SPECIFIERS.map((s) => s.replace(/[/]/g, '\\/')).join(
    '|',
  )})(?:['"]|/)`,
)

// Match nested module imports; the raw app stylesheet has no nested path segment.
const deepModuleRe = new RegExp(
  `${LEAD}@\\/(?:features|shared|app)\\/[a-z0-9-]+\\/`,
)

describe('no stale deep-import specifiers remain', () => {
  it('no source imports/mocks a migrated-away path', () => {
    const offenders = allSources
      .filter((f) => staleImportRe.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files still import a migrated-away specifier: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('no source reaches deep into a feature/shared/app module', () => {
    const offenders = allSources
      .filter((f) => deepModuleRe.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(repoRoot.length + 1))
    expect(
      offenders,
      `these files deep-import a module's internals (use the bare @/features/<name>, @/shared/<name> or @/app): ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

// These globs target removed directories; current module blocks enforce their boundaries.
const DEAD_ESLINT_GLOBS = [
  'apps/web/src/components/**/*.{ts,tsx}',
  'apps/web/src/hooks/**/*.{ts,tsx}',
  'apps/web/src/lib/**/*.{ts,tsx}',
]

const APP_WIDE_GLOB = 'apps/web/src/**/*.{ts,tsx}'
const MODULE_GLOBS = [
  'apps/web/src/features/**/*.{ts,tsx}',
  'apps/web/src/shared/**/*.{ts,tsx}',
  'apps/web/src/app/**/*.{ts,tsx}',
]

// Use a nonliteral import because the JavaScript config has no type declarations.
type RestrictedPattern = { group?: Array<string>; message?: string }
type Block = { files?: Array<string>; rules?: Record<string, unknown> }

const eslintSpecifier = '@bcordes/config/eslint'
const eslintModule = (await import(eslintSpecifier)) as {
  config: Array<Block>
}
const eslintBlocks = eslintModule.config

const blocksFor = (glob: string): Array<Block> =>
  eslintBlocks.filter((b) => Array.isArray(b.files) && b.files.includes(glob))

const patternsOf = (block: Block | undefined): Array<RestrictedPattern> => {
  const rule = block?.rules?.['no-restricted-imports']
  if (!Array.isArray(rule) || rule.length < 2) return []
  const opts = rule[1] as { patterns?: Array<RestrictedPattern> }
  return Array.isArray(opts.patterns) ? opts.patterns : []
}

const hasGroupWith = (
  patterns: Array<RestrictedPattern>,
  ...members: Array<string>
): boolean =>
  patterns.some(
    (p) => Array.isArray(p.group) && members.every((m) => p.group?.includes(m)),
  )

describe('dead ESLint module-boundary blocks are pruned', () => {
  it.each(DEAD_ESLINT_GLOBS)('no block is scoped to %s', (glob) => {
    expect(
      blocksFor(glob),
      `the ${glob} block matches zero files after the flatten and must be removed`,
    ).toEqual([])
  })

  it('no block scopes any removed horizontal dir under apps/web/src', () => {
    const removedDirRe =
      /^apps\/web\/src\/(?:components|hooks|lib|config|styles)\//
    const offenders = eslintBlocks
      .flatMap((b) => b.files ?? [])
      .filter((glob) => removedDirRe.test(glob))
    expect(
      offenders,
      `these ESLint files globs target removed dirs: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

describe('surviving ESLint blocks subsume the pruned layer blocks', () => {
  it('the app-wide block still denies deep module imports', () => {
    const [block] = blocksFor(APP_WIDE_GLOB)
    expect(block, `no ESLint block found for ${APP_WIDE_GLOB}`).toBeDefined()
    expect(
      hasGroupWith(
        patternsOf(block),
        '@/features/*/*',
        '@/shared/*/*',
        '@/app/*/*',
      ),
      'the app-wide block must deny deep imports into features/, shared/ and app/',
    ).toBe(true)
  })

  it('one block scopes features/, shared/ and app/ together', () => {
    const carriers = eslintBlocks.filter(
      (b) =>
        Array.isArray(b.files) &&
        MODULE_GLOBS.every((g) => b.files?.includes(g)),
    )
    expect(
      carriers.length,
      'no ESLint block scopes apps/web/src/{features,shared,app} together',
    ).toBe(1)
  })

  it('that block carries the no-importing-routes rule the layer blocks used to', () => {
    const [block] = eslintBlocks.filter(
      (b) =>
        Array.isArray(b.files) &&
        MODULE_GLOBS.every((g) => b.files?.includes(g)),
    )
    expect(
      hasGroupWith(patternsOf(block), '@/routes/*'),
      'the features/shared/app block must deny importing from @/routes/*',
    ).toBe(true)
  })
})

describe.skipIf(!hasClaude)(
  'CLAUDE.md Key Directories describe the features/ + shared/ layout',
  () => {
    it('has a Key Directories section', () => {
      expect(keyDirs, 'CLAUDE.md Key Directories section not found').not.toBe(
        '',
      )
    })

    it('lists apps/web/src/features/ and apps/web/src/shared/', () => {
      expect(keyDirs, 'Key Directories must document features/').toMatch(
        /apps\/web\/src\/features\//,
      )
      expect(keyDirs, 'Key Directories must document shared/').toMatch(
        /apps\/web\/src\/shared\//,
      )
    })

    it('documents the app/ shell layer that absorbed components/layout, config/, lib/ and styles.css', () => {
      expect(
        keyDirs,
        'Key Directories must document the apps/web/src/app/ shell layer',
      ).toMatch(/apps\/web\/src\/app\//)
    })

    it('names both cross-cutting shared modules (auth and motion)', () => {
      const sharedEntry =
        keyDirs
          .split('\n')
          .find((line) => line.includes('apps/web/src/shared/')) ?? ''
      expect(
        sharedEntry,
        'the shared/ entry must name the auth module',
      ).toMatch(/auth/)
      expect(
        sharedEntry,
        'the shared/ entry must name the motion module',
      ).toMatch(/motion/)
    })

    it('no longer advertises the dissolved components/ and hooks/ buckets', () => {
      expect(
        keyDirs,
        'Key Directories must not list the removed components/ bucket',
      ).not.toMatch(/apps\/web\/src\/components\//)
      expect(
        keyDirs,
        'Key Directories must not list the removed hooks/ bucket',
      ).not.toMatch(/apps\/web\/src\/hooks\//)
      expect(
        keyDirs,
        'Key Directories must not enumerate a components/{...} bucket',
      ).not.toMatch(/components\/\{/)
    })

    it('no longer advertises the removed apps/web/src/server-fns/ dir', () => {
      expect(
        keyDirs,
        'Key Directories must not list the removed server-fns/ dir',
      ).not.toMatch(/server-fns/)
    })

    it('no longer advertises the removed apps/web/src/content/ dir', () => {
      expect(
        keyDirs,
        'Key Directories must not list the removed content/ dir',
      ).not.toMatch(/apps\/web\/src\/content\//)
    })

    it('no longer enumerates the per-feature components/{home,about,...} dirs', () => {
      expect(
        keyDirs,
        'Key Directories must not enumerate the migrated-away per-feature component dirs',
      ).not.toMatch(/components\/\{[^}]*\b(?:home|about|contact|projects)\b/)
    })

    it('preserves the packages/valkey/src/index.ts sanctioned-barrel reference', () => {
      expect(CLAUDE).toMatch(/packages\/valkey\/src\/index\.ts/)
    })
  },
)

describe('README Project Structure describes the features/ + shared/ layout', () => {
  it('has a Project Structure section', () => {
    expect(
      projectStructure,
      'README Project Structure section not found',
    ).not.toBe('')
  })

  // Parse tree entries so descriptions such as "component library" cannot match directory names.
  const treeEntries = projectStructure
    .split('\n')
    .map((line) => line.match(/[├└]──\s+([\w.@-]+\/)/)?.[1])
    .filter((entry): entry is string => entry !== undefined)

  it('discovers the tree entries (floor guard)', () => {
    // Prevent an empty tree from passing the absence checks.
    expect(treeEntries).toContain('apps/')
    expect(treeEntries).toContain('packages/')
  })

  it('shows the features/, shared/ and app/ module roots in the tree', () => {
    expect(
      treeEntries,
      'Project Structure tree must show the features/ root',
    ).toContain('features/')
    expect(
      treeEntries,
      'Project Structure tree must show the shared/ root',
    ).toContain('shared/')
    expect(
      treeEntries,
      'Project Structure tree must show the app/ shell root',
    ).toContain('app/')
  })

  it('names both shared modules (auth and motion) on the shared/ entry', () => {
    const sharedLine =
      projectStructure.split('\n').find((line) => /shared\//.test(line)) ?? ''
    expect(sharedLine, 'the shared/ entry must name the auth module').toMatch(
      /auth/,
    )
    expect(sharedLine, 'the shared/ entry must name the motion module').toMatch(
      /motion/,
    )
  })

  it('no longer shows the dissolved components/ and hooks/ tree entries', () => {
    expect(
      treeEntries,
      'Project Structure must not show the removed components/ bucket',
    ).not.toContain('components/')
    expect(
      treeEntries,
      'Project Structure must not show the removed hooks/ bucket',
    ).not.toContain('hooks/')
  })

  it('no longer shows the removed server-fns/ dir', () => {
    expect(
      projectStructure,
      'Project Structure must not show the removed server-fns/ dir',
    ).not.toMatch(/server-fns/)
  })

  it('no longer shows the removed content/ dir', () => {
    expect(
      projectStructure,
      'Project Structure must not show the removed content/ dir',
    ).not.toMatch(/content\//)
  })
})
