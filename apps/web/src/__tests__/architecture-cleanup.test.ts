import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Final-cleanup wiring spec — originally the closing task of the
// feature-based-architecture refactor (bcordes-6ow.9), now rewritten for the
// FULL-FLATTEN end state (bcordes-hcv.4.1). Every horizontal bucket under
// apps/web/src has been dissolved: the per-feature component dirs, server-fns/
// and content/ went to features/* (6ow); hooks/ and components/shared/ went to
// shared/motion (hcv.2); components/layout, config/, lib/ and styles.css went to
// app/ (hcv.3). What remains under apps/web/src is routes/, features/, shared/,
// app/, __tests__/ and the router/start entrypoints — no horizontal layer dirs.
//
// These specs assert that END STATE: (1) every dissolved horizontal dir is gone
// and the relocated app/ + shared/motion surface exists in its place; (2) no real
// import/mock across apps/web/src OR packages/* points at a migrated-away path or
// reaches deep into a module's internals (features/, shared/, AND app/); (3) the
// now-dead ESLint module-boundary blocks that scoped components/, hooks/ and lib/
// are pruned, their intent carried by the surviving app-wide + features/shared/app
// blocks; and (4) the CLAUDE.md Key Directories block and the README Project
// Structure tree describe the surviving layout.
//
// Mirrors the repo's structural wiring-spec convention (feature-architecture.test.ts,
// docs-workspace-layout.test.ts): resolve the repo root from this file and inspect
// the real filesystem / config / docs — asserting the NEW reality, never the
// pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as feature-architecture.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const selfPath = fileURLToPath(import.meta.url)

const CLAUDE = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8')
const README = readFileSync(join(repoRoot, 'README.md'), 'utf8')

/** Slice a markdown doc between a heading and the next heading of the same level. */
const section = (doc: string, heading: string): string => {
  const start = doc.indexOf(heading)
  if (start === -1) return ''
  const rest = doc.slice(start + heading.length)
  const level = heading.match(/^#+/)?.[0] ?? '##'
  const end = rest.indexOf(`\n${level} `)
  return end === -1 ? rest : rest.slice(0, end)
}

const keyDirs = section(CLAUDE, '### Key Directories')
const projectStructure = section(README, '## Project Structure')

// ---------------------------------------------------------------------------
// 1. Emptied horizontal directories removed
// ---------------------------------------------------------------------------

// Every horizontal dir the flatten dissolved. After the full flatten none of
// these exists under apps/web/src — including the top-level buckets themselves,
// not just their former per-feature leaves.
const REMOVED_DIRS = [
  'components/home',
  'components/about',
  'components/projects',
  'components/contact',
  'components/dashboard',
  'server-fns',
  'content',
  // Emptied by the shared/motion extraction (bcordes-hcv.2): useReducedMotion +
  // useScrollAnimation left hooks/, FadeInView left components/shared/, and both
  // now live under shared/motion/, so these horizontal buckets are gone too.
  'hooks',
  'components/shared',
  // Dissolved by the app/ shell extraction (bcordes-hcv.3): layout components,
  // the navigation config, web-vitals and the global stylesheet all moved under
  // app/, which empties the last four horizontal buckets outright.
  'components',
  'config',
  'lib',
  'styles',
]

// The relocated surface the flatten must LEAVE IN PLACE (over-deletion guard).
// Each entry is where a dissolved horizontal dir's content actually landed, so a
// move that deleted without relocating fails here rather than passing REMOVED_DIRS.
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

// ---------------------------------------------------------------------------
// 2. No stale deep-import specifiers anywhere in apps/web/src or packages/*
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules',
  '.output',
  'dist',
  'coverage',
  '.git',
])

/** All .ts/.tsx source files under a root (excludes generated route tree + self). */
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

// An import/mock statement leading token — so prose or a guard's own assertion
// STRING (e.g. `['@/components', 'home'].join('/')`) is not a false positive;
// only a real module reference (from '…' / import('…') / vi.mock('…') / require('…'))
// is flagged.
const LEAD = String.raw`(?:from|import|vi\.mock|require)\s*\(?\s*['"]`

// Migrated-away specifiers: their code now lives under features/* or shared/*.
// Built non-literally (mirroring the sibling feature-module guards' `[...].join('/')`
// convention) so this spec file's own text never contains a stale specifier
// substring — otherwise those guards' `readFileSync().includes()` scans would
// false-positive on this file. Runtime values are byte-identical to the literals.
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
  // Migrated into app/ by the shell extraction (bcordes-hcv.3) — consumers now
  // import the three named symbols from the bare @/app barrel.
  ['@/components', 'layout'].join('/'),
  ['@/config', 'navigation'].join('/'),
  ['@/lib', 'web-vitals'].join('/'),
  // Migrated into shared/motion by the motion extraction (bcordes-hcv.2).
  ['@/hooks', 'useReducedMotion'].join('/'),
  ['@/hooks', 'useScrollAnimation'].join('/'),
  ['@/components', 'shared'].join('/'),
  // Deleted outright as dead code alongside the motion extraction.
  ['@/hooks', 'use-mobile'].join('/'),
]

// A real import/mock of any migrated-away specifier (specifier followed by a
// quote or a deeper path segment).
const staleImportRe = new RegExp(
  `${LEAD}(?:${STALE_SPECIFIERS.map((s) => s.replace(/[/]/g, '\\/')).join(
    '|',
  )})(?:['"]|/)`,
)

// A real import/mock reaching DEEP into a module's internals
// (@/features/<name>/…, @/shared/<name>/… or @/app/<name>/…) — the bare module
// path is fine, as is the raw app stylesheet asset (no second path segment).
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

// ---------------------------------------------------------------------------
// 3. Dead ESLint module-boundary blocks are pruned
// ---------------------------------------------------------------------------

// The three layer blocks whose files globs scoped the now-removed horizontal dirs
// match zero files after the flatten, so they must be gone from the flat config.
// Their intents are fully subsumed: "must not import from routes" by the
// features/shared/app block, and "must not reach into another layer" by the
// noDeepModuleImports group carried on the app-wide block.
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

// The config module is authored in JS (@ts-check + JSDoc, no .d.ts), so a static
// import would trip TS7016. A non-literal specifier keeps tsc from resolving it
// while the runtime import still loads packages/config/eslint.js via its
// `./eslint` export — same approach as feature-architecture.test.ts.
type RestrictedPattern = { group?: Array<string>; message?: string }
type Block = { files?: Array<string>; rules?: Record<string, unknown> }

const eslintSpecifier = '@bcordes/config/eslint'
const eslintModule = (await import(eslintSpecifier)) as {
  config: Array<Block>
}
const eslintBlocks = eslintModule.config
const eslintSource = readFileSync(
  join(repoRoot, 'packages/config/eslint.js'),
  'utf8',
)

/** Every block whose `files` array contains the given exact glob entry. */
const blocksFor = (glob: string): Array<Block> =>
  eslintBlocks.filter((b) => Array.isArray(b.files) && b.files.includes(glob))

/** The no-restricted-imports pattern objects for a block (empty if unset). */
const patternsOf = (block: Block | undefined): Array<RestrictedPattern> => {
  const rule = block?.rules?.['no-restricted-imports']
  if (!Array.isArray(rule) || rule.length < 2) return []
  const opts = rule[1] as { patterns?: Array<RestrictedPattern> }
  return Array.isArray(opts.patterns) ? opts.patterns : []
}

/** True if some pattern's `group` array includes every one of `members`. */
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

  it('records why the layer blocks were retired', () => {
    expect(
      eslintSource,
      'the module-boundary section must note that the components/hooks/lib blocks were retired with the dirs they governed',
    ).toMatch(/retir/i)
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

// ---------------------------------------------------------------------------
// 4. Docs describe the feature-based layout (doc-staleness guard)
// ---------------------------------------------------------------------------

describe('CLAUDE.md Key Directories describe the features/ + shared/ layout', () => {
  it('has a Key Directories section', () => {
    expect(keyDirs, 'CLAUDE.md Key Directories section not found').not.toBe('')
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
    expect(sharedEntry, 'the shared/ entry must name the auth module').toMatch(
      /auth/,
    )
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
    // Post-cleanup only components/{layout,shared} remain; the stale
    // components/{home,about,contact,projects,layout,shared} enumeration must go.
    expect(
      keyDirs,
      'Key Directories must not enumerate the migrated-away per-feature component dirs',
    ).not.toMatch(/components\/\{[^}]*\b(?:home|about|contact|projects)\b/)
  })

  it('preserves the packages/valkey/src/index.ts sanctioned-barrel reference', () => {
    // docs-workspace-layout guard invariant — must survive the docs edit.
    expect(CLAUDE).toMatch(/packages\/valkey\/src\/index\.ts/)
  })
})

describe('README Project Structure describes the features/ + shared/ layout', () => {
  it('has a Project Structure section', () => {
    expect(
      projectStructure,
      'README Project Structure section not found',
    ).not.toBe('')
  })

  // Directory entries the ascii tree actually names ('features/', 'app/', …),
  // tree glyphs and indentation stripped. Comparing against this list rather
  // than grepping the raw section keeps `packages/ui`'s "component library"
  // prose from masquerading as a components/ tree entry.
  const treeEntries = projectStructure
    .split('\n')
    .map((line) => line.match(/[├└]──\s+([\w.@-]+\/)/)?.[1])
    .filter((entry): entry is string => entry !== undefined)

  it('discovers the tree entries (floor guard)', () => {
    // Without this the not.toContain assertions below could pass vacuously.
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
