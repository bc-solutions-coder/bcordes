import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Feature-based-architecture scaffold wiring spec (bcordes-6ow.1 / .1.1).
//
// This task introduces two new module roots under the app — apps/web/src/features/
// and apps/web/src/shared/ — where each module exposes a public API via its own
// src index and keeps internals private. Cross-module imports must target the
// bare module (@/features/notifications, @/shared/auth), never its internals, and
// features/shared must never depend on routes (routes consume features, not the
// reverse). ESLint enforces this through a new `noDeepModuleImports` deny group
// that, because flat config REPLACES (not merges) rule options, has to be carried
// by every app-scoped no-restricted-imports block plus a new features/shared block.
//
// These specs assert (1) the roots exist, (2) the ESLint boundary is wired into
// every relevant block, and (3) CLAUDE.md documents the new roots and convention.
// Mirrors the repo's config/doc test convention (docs-workspace-layout.test.ts):
// resolve the repo root from this file, inspect the real config/doc.

// apps/web/src/__tests__ -> repo root (same convention as docs-workspace-layout.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const CLAUDE = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8')

// Narrow structural view of the flat ESLint config we care about here. The
// config module is authored in JS (@ts-check + JSDoc), so we cast through
// unknown to the shape this spec inspects rather than pulling in eslint's types.
type RestrictedPattern = { group?: Array<string>; message?: string }
type Block = {
  files?: Array<string>
  rules?: Record<string, unknown>
}

// The config module is authored in JS (no .d.ts), so importing it statically
// would trip TS7016. A non-literal specifier keeps tsc from resolving it while
// the runtime import still loads packages/config/eslint.js (its `./eslint`
// export). We then annotate the shape this spec inspects.
const eslintSpecifier = '@bcordes/config/eslint'
const eslintModule = (await import(eslintSpecifier)) as {
  config: Array<Block>
}
const blocks = eslintModule.config

/** The single block whose `files` array contains the given exact glob entry. */
const blockFor = (glob: string): Block | undefined =>
  blocks.find((b) => Array.isArray(b.files) && b.files.includes(glob))

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

// The four existing app-scoped boundary blocks (exact `files` glob entries)
// that must each carry the new deep-module deny group.
const APP_BOUNDARY_GLOBS = [
  'apps/web/src/**/*.{ts,tsx}',
  'apps/web/src/components/**/*.{ts,tsx}',
  'apps/web/src/hooks/**/*.{ts,tsx}',
  'apps/web/src/lib/**/*.{ts,tsx}',
]

describe('features/ and shared/ module roots exist', () => {
  it('has an apps/web/src/features/ root (tracked via .gitkeep)', () => {
    expect(existsSync(join(appSrc, 'features'))).toBe(true)
    expect(existsSync(join(appSrc, 'features/.gitkeep'))).toBe(true)
  })

  it('has an apps/web/src/shared/ root (tracked via .gitkeep)', () => {
    expect(existsSync(join(appSrc, 'shared'))).toBe(true)
    expect(existsSync(join(appSrc, 'shared/.gitkeep'))).toBe(true)
  })
})

describe('ESLint forbids deep imports into feature/shared module internals', () => {
  it('defines a noDeepModuleImports group targeting @/features/*/* and @/shared/*/*', () => {
    // At least one block must declare the deep-module deny group; its presence
    // anywhere proves the constant was defined and wired in.
    const carriers = blocks.filter((b) =>
      hasGroupWith(patternsOf(b), '@/features/*/*', '@/shared/*/*'),
    )
    expect(
      carriers.length,
      'no block denies deep feature/shared imports (@/features/*/*, @/shared/*/*)',
    ).toBeGreaterThan(0)
  })

  it.each(APP_BOUNDARY_GLOBS)(
    'carries the deep-module deny group in the %s block',
    (glob) => {
      const block = blockFor(glob)
      expect(
        block,
        `no ESLint block found for files glob ${glob}`,
      ).toBeDefined()
      expect(
        hasGroupWith(patternsOf(block), '@/features/*/*', '@/shared/*/*'),
        `block for ${glob} must deny deep feature/shared imports`,
      ).toBe(true)
    },
  )
})

describe('ESLint features/shared boundary block', () => {
  // The new block scoping features/ and shared/ sources.
  const featureBlock = blocks.find(
    (b) =>
      Array.isArray(b.files) &&
      b.files.some((f) => f.includes('apps/web/src/features/')) &&
      b.files.some((f) => f.includes('apps/web/src/shared/')),
  )

  it('exists, scoping both apps/web/src/features and apps/web/src/shared', () => {
    expect(
      featureBlock,
      'no ESLint block scopes apps/web/src/features + apps/web/src/shared',
    ).toBeDefined()
  })

  it('forbids features/shared from importing routes (@/routes/*)', () => {
    expect(
      hasGroupWith(patternsOf(featureBlock), '@/routes/*'),
      'features/shared block must deny importing from @/routes/*',
    ).toBe(true)
  })

  it('also carries the deep-module deny group', () => {
    expect(
      hasGroupWith(patternsOf(featureBlock), '@/features/*/*', '@/shared/*/*'),
      'features/shared block must also deny deep feature/shared imports',
    ).toBe(true)
  })
})

describe('CLAUDE.md documents the new module roots and convention', () => {
  it('lists apps/web/src/features/ under Key Directories', () => {
    expect(CLAUDE, 'CLAUDE.md must document apps/web/src/features/').toMatch(
      /apps\/web\/src\/features\//,
    )
  })

  it('lists apps/web/src/shared/ under Key Directories', () => {
    expect(CLAUDE, 'CLAUDE.md must document apps/web/src/shared/').toMatch(
      /apps\/web\/src\/shared\//,
    )
  })

  it('documents the bare-module import convention with examples', () => {
    expect(
      CLAUDE,
      'CLAUDE.md must show the bare feature-module import path (@/features/notifications)',
    ).toMatch(/@\/features\/notifications/)
    expect(
      CLAUDE,
      'CLAUDE.md must show the bare shared-module import path (@/shared/auth)',
    ).toMatch(/@\/shared\/auth/)
  })

  it('preserves the packages/valkey/src/index.ts sanctioned-barrel reference (guard against clobbering)', () => {
    // The features/shared barrel exception is appended to the existing
    // no-barrel rule; the valkey reference (asserted by docs-workspace-layout)
    // must survive the edit.
    expect(CLAUDE).toMatch(/packages\/valkey\/src\/index\.ts/)
  })
})
