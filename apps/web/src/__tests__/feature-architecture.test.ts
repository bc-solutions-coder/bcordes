import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Module boundary rules are described in [Development](../../../../docs/development.md).

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const hasClaude = existsSync(join(repoRoot, 'CLAUDE.md'))
const CLAUDE = hasClaude
  ? readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8')
  : ''

type RestrictedPattern = { group?: Array<string>; message?: string }
type Block = {
  files?: Array<string>
  rules?: Record<string, unknown>
}

// Use a nonliteral import because the JavaScript config has no type declarations.
const eslintSpecifier = '@bcordes/config/eslint'
const eslintModule = (await import(eslintSpecifier)) as {
  config: Array<Block>
}
const blocks = eslintModule.config

const blockFor = (glob: string): Block | undefined =>
  blocks.find((b) => Array.isArray(b.files) && b.files.includes(glob))

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

// Flat config replaces rule options, so each applicable block must repeat the import restrictions.
const APP_BOUNDARY_GLOBS = ['apps/web/src/**/*.{ts,tsx}']

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

describe.skipIf(!hasClaude)(
  'CLAUDE.md documents the new module roots and convention',
  () => {
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
      expect(CLAUDE).toMatch(/packages\/valkey\/src\/index\.ts/)
    })
  },
)
