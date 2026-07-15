import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// Contact feature-module migration wiring spec (bcordes-6ow.7 / .7.1).
//
// Task 6 of the feature-based-architecture refactor relocates the horizontal
// apps/web/src/components/contact/* directory into a self-contained feature
// module at apps/web/src/features/contact/, exposing a public API via its own
// index.ts and repointing every consumer at the bare @/features/contact entry
// point. After the move:
//   * ContactForm.tsx / ContactFormFields.tsx / ContactFormSuccess.tsx move to
//     features/contact/components/
//   * contact-form.schema.ts moves to features/contact/lib/ (the feature's local
//     lib; it stays INTERNAL — not re-exported from index.ts — because the scout
//     confirmed no consumer outside the feature imports the schema)
//   * features/contact/index.ts re-exports the three contact components from
//     ./components/*
//   * the old @/components/contact path is referenced by no source under
//     apps/web/src (static imports AND vi.mock module-path string keys), and the
//     public API actually resolves the three named component exports
//
// CROSS-FEATURE BOUNDARY: ContactForm.tsx imports submitInquiry from the sibling
// feature's public barrel (@/features/inquiries) and useUser from @/shared/auth.
// Those bare-index cross-feature imports are allowed by the boundary rules
// (bcordes-6ow.1.1); this spec confirms ContactForm keeps consuming inquiries
// through the public @/features/inquiries barrel, never the old
// @/server-fns/inquiries deep path.
//
// Mirrors the repo's structural wiring-spec convention (home/about/projects/
// inquiries-feature-module.test.ts): resolve the repo root from this file,
// inspect the real filesystem / config, and confirm the new reality — never the
// pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as about-feature-module.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const contactFeatureDir = join(appSrc, 'features/contact')
const contactFeatureIndex = join(contactFeatureDir, 'index.ts')
const contactFeatureComponents = join(contactFeatureDir, 'components')
const contactFeatureLib = join(contactFeatureDir, 'lib')
const oldContactDir = join(appSrc, 'components/contact')

// The three contact components the scout confirmed are each NAMED exports
// (function declarations) — the module's sanctioned public API surface.
const EXPECTED_EXPORTS = [
  'ContactForm',
  'ContactFormFields',
  'ContactFormSuccess',
] as const

// The stale deep-import paths this migration must eliminate. Built by joining so
// this spec file itself is not a false positive when it scans the source tree.
const OLD_CONTACT_PATH = ['@/components', 'contact'].join('/')
const OLD_INQUIRIES_PATH = ['@/server-fns', 'inquiries'].join('/')

// The internal schema module MUST stay internal: index.ts must NOT re-export it,
// because no consumer outside features/contact imports the schema.
const INTERNAL_SCHEMA_BASENAME = 'contact-form.schema'

// Consumers this task owns and must repoint at @/features/contact. These files do
// NOT move (only their import / vi.mock specifiers change), so their paths are
// stable and each must reference '@/features/contact' after the move.
const CONTACT_CONSUMERS = [
  'routes/contact.tsx',
  'routes/contact.test.tsx',
] as const

const readIndex = (): string =>
  existsSync(contactFeatureIndex)
    ? readFileSync(contactFeatureIndex, 'utf8')
    : ''

/** All .ts/.tsx source files under apps/web/src (excludes generated route tree). */
function collectSources(dir: string, acc: Array<string> = []): Array<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSources(full, acc)
    } else if (
      (full.endsWith('.ts') || full.endsWith('.tsx')) &&
      !full.endsWith('routeTree.gen.ts')
    ) {
      acc.push(full)
    }
  }
  return acc
}

// Mock the server-fn machinery + the auth/wallow deps that ContactForm pulls in
// transitively (via @/features/inquiries's submitInquiry and @/shared/auth's
// useUser), so importing features/contact's index resolves cleanly at runtime —
// mirrors the existing inquiries-feature-module.test.ts setup.
vi.mock('@tanstack/react-start', () => {
  const createServerFn = () => {
    let handlerFn: (...args: Array<unknown>) => unknown
    const chain = {
      inputValidator: () => chain,
      handler: (fn: (...args: Array<unknown>) => unknown) => {
        handlerFn = fn
        const callable = (...args: Array<unknown>) => handlerFn(...args)
        Object.assign(callable, chain)
        return callable
      },
    }
    return chain
  }
  return { createServerFn }
})

vi.mock('@bcordes/wallow/client', () => ({
  createWallowClient: vi.fn(),
}))

vi.mock('@bcordes/wallow/service-client', () => ({
  serviceClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    head: vi.fn(),
  },
}))

vi.mock('@bcordes/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@bcordes/auth/middleware', () => ({
  requireAdmin: vi.fn(),
}))

describe('features/contact module exists with a public index', () => {
  it('has an apps/web/src/features/contact/ directory', () => {
    expect(existsSync(contactFeatureDir)).toBe(true)
  })

  it('co-locates a components/ subdirectory', () => {
    expect(existsSync(contactFeatureComponents)).toBe(true)
  })

  it('co-locates a lib/ subdirectory (the moved schema module)', () => {
    expect(existsSync(contactFeatureLib)).toBe(true)
  })

  it('exposes a public API at apps/web/src/features/contact/index.ts', () => {
    expect(existsSync(contactFeatureIndex)).toBe(true)
  })

  it.each(EXPECTED_EXPORTS)(
    'index.ts re-exports %s from its local components/',
    (name) => {
      const src = readIndex()
      // Match `export { Name } from './components/Name'` (allowing extra names
      // in the same brace group and either quote style).
      const pattern = new RegExp(
        `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]\\./components/`,
      )
      expect(
        pattern.test(src),
        `features/contact/index.ts must re-export ${name} from ./components/*`,
      ).toBe(true)
    },
  )

  it('keeps the contact-form schema internal (index.ts does not re-export it)', () => {
    const src = readIndex()
    expect(
      src.includes(INTERNAL_SCHEMA_BASENAME),
      'features/contact/index.ts must NOT re-export the internal contact-form.schema',
    ).toBe(false)
  })
})

describe('the horizontal components/contact directory is gone', () => {
  it('apps/web/src/components/contact/ no longer exists', () => {
    expect(existsSync(oldContactDir)).toBe(false)
  })
})

describe('no source imports the old contact / inquiries deep paths', () => {
  const scan = (needle: string): Array<string> =>
    collectSources(appSrc)
      .filter((f) => f !== fileURLToPath(import.meta.url))
      .filter((f) => readFileSync(f, 'utf8').includes(needle))
      .map((f) => f.slice(repoRoot.length + 1))

  it('no .ts/.tsx under apps/web/src references @/components/contact', () => {
    const offenders = scan(OLD_CONTACT_PATH)
    expect(
      offenders,
      `these files still reference ${OLD_CONTACT_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('no .ts/.tsx under apps/web/src references @/server-fns/inquiries', () => {
    // ContactForm must consume inquiries through the public @/features/inquiries
    // barrel, never the old deep server-fns path (repointed by bcordes-6ow.6.1;
    // the contact files are this task's remaining owners of that stale path).
    const offenders = scan(OLD_INQUIRIES_PATH)
    expect(
      offenders,
      `these files still reference ${OLD_INQUIRIES_PATH}: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

describe('ContactForm consumes the inquiries feature via its public barrel', () => {
  it('features/contact/components/ContactForm.tsx imports submitInquiry from @/features/inquiries', () => {
    const contactForm = join(contactFeatureComponents, 'ContactForm.tsx')
    expect(existsSync(contactForm), 'ContactForm.tsx should exist').toBe(true)
    const contents = existsSync(contactForm)
      ? readFileSync(contactForm, 'utf8')
      : ''
    expect(
      /import\s*\{[^}]*\bsubmitInquiry\b[^}]*\}\s*from\s*['"]@\/features\/inquiries['"]/.test(
        contents,
      ),
      'ContactForm.tsx must import submitInquiry from @/features/inquiries',
    ).toBe(true)
  })
})

describe('every contact consumer resolves via the new @/features/contact path', () => {
  it.each(CONTACT_CONSUMERS)(
    '%s imports from @/features/contact',
    (relPath) => {
      const full = join(appSrc, relPath)
      expect(existsSync(full), `${relPath} should exist`).toBe(true)
      const contents = existsSync(full) ? readFileSync(full, 'utf8') : ''
      expect(
        contents.includes('@/features/contact'),
        `${relPath} must reference @/features/contact`,
      ).toBe(true)
    },
  )
})

describe('the public API resolves the three named exports', () => {
  it('@/features/contact exports ContactForm, ContactFormFields, ContactFormSuccess', async () => {
    // Non-literal specifier so vite's import-analysis defers resolution to
    // runtime (mirrors about-feature-module.test.ts's `aboutSpecifier`), letting
    // this file collect and fail per-assertion rather than at transform.
    const contactSpecifier = '@/features/contact'
    const mod = (await import(contactSpecifier)) as Record<string, unknown>
    for (const name of EXPECTED_EXPORTS) {
      expect(
        typeof mod[name],
        `@/features/contact must export a ${name} component`,
      ).toBe('function')
    }
  })
})
