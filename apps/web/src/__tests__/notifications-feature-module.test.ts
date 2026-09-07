import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// Notifications feature-module migration wiring spec (bcordes-6ow.8 / .8.1).
//
// Task 7 of the feature-based-architecture refactor — the largest — consolidates
// the notification sources scattered across four horizontal buckets into a single
// self-contained feature module at apps/web/src/features/notifications/, exposing a
// public API via its own index.ts and repointing every consumer at the bare
// @/features/notifications entry point. After the move:
//   * components/layout/NotificationBell.{tsx,test.tsx} and
//     components/dashboard/NotificationRow.{tsx,test.tsx} move to
//     features/notifications/components/ (components/dashboard/ is then empty and gone)
//   * hooks/{EventStreamProvider,useEventStream,useEventStreamEvents,
//     useNotificationFilters,useNotificationSelection,usePushNotifications} (+ tests)
//     move to features/notifications/hooks/
//   * lib/notifications/{routing,query-utils} (+ tests) move to
//     features/notifications/lib/ (lib/notifications/ is then gone)
//   * server-fns/notifications.{ts,test.ts} moves to
//     features/notifications/server-fns/
//   * features/notifications/index.ts re-exports the feature's public surface —
//     the two components, the six notification hooks, the two lib helpers, and the
//     nine server fns actually consumed elsewhere — plus the EventStreamContextValue
//     and NotificationType type aliases
//   * every intra-feature import becomes relative and no source under apps/web/src
//     references any of the old horizontal deep paths (static imports AND vi.mock
//     module-path string keys); the public API actually resolves the value exports.
//
// The SSE route apps/web/src/routes/api/events?subscribe=Notifications,Inquiries.ts does NOT move and
// needs no repoint — it imports only @tanstack/react-router, @bcordes/logger,
// @bcordes/auth, and @bcordes/wallow, never any of the moving hook/component/lib/
// server-fn paths (scout-confirmed via grep). It is untouched by this task.
//
// Mirrors the repo's structural wiring-spec convention (home/about/projects/
// inquiries/contact-feature-module.test.ts): resolve the repo root from this file,
// inspect the real filesystem / config, and confirm the new reality — never the
// pre-migration one.

// apps/web/src/__tests__ -> repo root (same convention as inquiries-feature-module.test.ts).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const featureDir = join(appSrc, 'features/notifications')
const featureIndex = join(featureDir, 'index.ts')
const featureComponents = join(featureDir, 'components')
const featureHooks = join(featureDir, 'hooks')
const featureLib = join(featureDir, 'lib')
const featureServerFns = join(featureDir, 'server-fns')

// The two components — each a NAMED function-component export.
const COMPONENT_EXPORTS = ['NotificationBell', 'NotificationRow'] as const

// The six notification hooks + the notificationTypes value const, all re-exported
// from ./hooks/*. (EventStreamProvider is a provider component that nonetheless
// lives under hooks/ per the scout's inventory; it re-exports from ./hooks/.)
const HOOK_EXPORTS = [
  'EventStreamProvider',
  'useEventStream',
  'useEventStreamEvents',
  'useNotificationFilters',
  'notificationTypes',
  'useNotificationSelection',
  'usePushNotifications',
] as const

// The two lib helpers — invalidateNotifications from ./lib/query-utils,
// getNotificationRoute from ./lib/routing (both under the ./lib/ subdir).
const LIB_EXPORTS = ['invalidateNotifications', 'getNotificationRoute'] as const

// The nine server fns re-exported from ./server-fns/notifications. ALL nine are
// externally consumed per the scout's grep — none may be trimmed.
const SERVER_FN_EXPORTS = [
  'fetchNotifications',
  'fetchUnreadCount',
  'markAllNotificationsRead',
  'markNotificationRead',
  'deregisterPushDevice',
  'fetchVapidPublicKey',
  'listPushDevices',
  'registerPushDevice',
  'sendTestPush',
] as const

// The two type aliases re-exported from ./hooks/* via `export type`.
const TYPE_EXPORTS = [
  ['EventStreamContextValue', 'hooks'],
  ['NotificationType', 'hooks'],
] as const

// [exportName, sourceSubdir] — index.ts must re-export each name from that subdir.
const REEXPORTS = [
  ...COMPONENT_EXPORTS.map((name) => [name, 'components'] as const),
  ...HOOK_EXPORTS.map((name) => [name, 'hooks'] as const),
  ...LIB_EXPORTS.map((name) => [name, 'lib'] as const),
  ...SERVER_FN_EXPORTS.map((name) => [name, 'server-fns'] as const),
]

// The old horizontal deep-import paths this migration must eliminate. Built by
// joining so this spec file itself is never a false positive when it scans the
// source tree. '@/hooks/useEventStream' subsumes '@/hooks/useEventStreamEvents'.
const OLD_PATHS: Array<[string, Array<string>]> = [
  ['EventStreamProvider hook', ['@/hooks', 'EventStreamProvider']],
  ['useEventStream hook', ['@/hooks', 'useEventStream']],
  ['useNotificationFilters hook', ['@/hooks', 'useNotificationFilters']],
  ['useNotificationSelection hook', ['@/hooks', 'useNotificationSelection']],
  ['usePushNotifications hook', ['@/hooks', 'usePushNotifications']],
  ['lib/notifications', ['@/lib', 'notifications']],
  ['server-fns/notifications', ['@/server-fns', 'notifications']],
  ['layout/NotificationBell', ['@/components', 'layout', 'NotificationBell']],
  [
    'dashboard/NotificationRow',
    ['@/components', 'dashboard', 'NotificationRow'],
  ],
].map(([label, parts]) => [label as string, parts as Array<string>])

// Old source files/dirs that must be gone after the move.
const OLD_FILES = [
  'components/layout/NotificationBell.tsx',
  'components/layout/NotificationBell.test.tsx',
  'components/dashboard/NotificationRow.tsx',
  'components/dashboard/NotificationRow.test.tsx',
  'hooks/EventStreamProvider.tsx',
  'hooks/useEventStream.ts',
  'hooks/useEventStreamEvents.ts',
  'hooks/useNotificationFilters.ts',
  'hooks/useNotificationSelection.ts',
  'hooks/usePushNotifications.ts',
  'server-fns/notifications.ts',
] as const

const OLD_DIRS = ['components/dashboard', 'lib/notifications'] as const

// Consumers this task owns and must repoint at @/features/notifications. None of
// these files move (only their import / vi.mock specifiers change), so their paths
// are stable and each must reference '@/features/notifications' after the move.
const CONSUMERS = [
  'routes/__root.tsx',
  'app/components/layout/Header.tsx',
  'app/components/layout/Header.test.tsx',
  'routes/dashboard/notifications.index.tsx',
  'routes/dashboard/notifications.index.test.tsx',
  'routes/dashboard/settings.index.tsx',
  'routes/dashboard/settings.index.test.tsx',
  'routes/dashboard/inquiries.index.tsx',
  'routes/dashboard/inquiries.index.test.tsx',
  'routes/dashboard/inquiries.$id.tsx',
  'routes/dashboard/inquiries.$id.test.tsx',
  '__tests__/notification-routing.test.ts',
] as const

const readIndex = (): string =>
  existsSync(featureIndex) ? readFileSync(featureIndex, 'utf8') : ''

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

// Mock the server-fn machinery + the auth/wallow deps the relocated server-fns and
// components pull in transitively, so importing features/notifications's index
// resolves cleanly at runtime — mirrors the existing inquiries/contact specs.
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

describe('features/notifications module exists with a public index', () => {
  it('has an apps/web/src/features/notifications/ directory', () => {
    expect(existsSync(featureDir)).toBe(true)
  })

  it('co-locates a components/ subdirectory', () => {
    expect(existsSync(featureComponents)).toBe(true)
  })

  it('co-locates a hooks/ subdirectory', () => {
    expect(existsSync(featureHooks)).toBe(true)
  })

  it('co-locates a lib/ subdirectory', () => {
    expect(existsSync(featureLib)).toBe(true)
  })

  it('co-locates a server-fns/ subdirectory', () => {
    expect(existsSync(featureServerFns)).toBe(true)
  })

  it('exposes a public API at apps/web/src/features/notifications/index.ts', () => {
    expect(existsSync(featureIndex)).toBe(true)
  })

  it.each(REEXPORTS)(
    'index.ts re-exports %s from its local ./%s/',
    (name, subdir) => {
      const src = readIndex()
      // Match `export { Name } from './<subdir>/...'` (allowing extra names in
      // the same brace group and either quote style).
      const pattern = new RegExp(
        `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]\\./${subdir}/`,
      )
      expect(
        pattern.test(src),
        `features/notifications/index.ts must re-export ${name} from ./${subdir}/*`,
      ).toBe(true)
    },
  )

  it.each(TYPE_EXPORTS)(
    'index.ts re-exports the %s type from its local ./%s/',
    (name, subdir) => {
      const src = readIndex()
      // Match `export type { Name } from './<subdir>/...'`.
      const pattern = new RegExp(
        `export\\s+type\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]\\./${subdir}/`,
      )
      expect(
        pattern.test(src),
        `features/notifications/index.ts must re-export type ${name} from ./${subdir}/*`,
      ).toBe(true)
    },
  )
})

describe('the horizontal notification source files are gone', () => {
  it.each(OLD_FILES)('apps/web/src/%s no longer exists', (relPath) => {
    expect(existsSync(join(appSrc, relPath))).toBe(false)
  })

  it.each(OLD_DIRS)('apps/web/src/%s/ no longer exists', (relDir) => {
    expect(existsSync(join(appSrc, relDir))).toBe(false)
  })
})

describe('no source imports the old horizontal notification paths', () => {
  const scan = (needle: string): Array<string> =>
    collectSources(appSrc)
      .filter((f) => f !== fileURLToPath(import.meta.url))
      .filter((f) => readFileSync(f, 'utf8').includes(needle))
      .map((f) => f.slice(repoRoot.length + 1))

  it.each(OLD_PATHS)(
    'no .ts/.tsx under apps/web/src references the old %s path',
    (_label, parts) => {
      const needle = parts.join('/')
      const offenders = scan(needle)
      expect(
        offenders,
        `these files still reference ${needle}: ${offenders.join(', ')}`,
      ).toEqual([])
    },
  )
})

describe('every notifications consumer resolves via the new @/features/notifications path', () => {
  it.each(CONSUMERS)('%s imports from @/features/notifications', (relPath) => {
    const full = join(appSrc, relPath)
    expect(existsSync(full), `${relPath} should exist`).toBe(true)
    const contents = existsSync(full) ? readFileSync(full, 'utf8') : ''
    expect(
      contents.includes('@/features/notifications'),
      `${relPath} must reference @/features/notifications`,
    ).toBe(true)
  })
})

describe('the public API resolves the expected value exports', () => {
  it('@/features/notifications exports the components, hooks, lib helpers, and server fns', async () => {
    // Non-literal specifier so vite's import-analysis defers resolution to
    // runtime (mirrors inquiries-feature-module.test.ts's `inquiriesSpecifier`),
    // letting this file collect and fail per-assertion rather than at transform.
    const notificationsSpecifier = '@/features/notifications'
    const mod = (await import(notificationsSpecifier)) as Record<
      string,
      unknown
    >

    const FUNCTION_EXPORTS = [
      ...COMPONENT_EXPORTS,
      'EventStreamProvider',
      'useEventStream',
      'useEventStreamEvents',
      'useNotificationFilters',
      'useNotificationSelection',
      'usePushNotifications',
      ...LIB_EXPORTS,
      ...SERVER_FN_EXPORTS,
    ] as const

    for (const name of FUNCTION_EXPORTS) {
      expect(
        typeof mod[name],
        `@/features/notifications must export a ${name} function`,
      ).toBe('function')
    }

    // notificationTypes is a value array (object at runtime).
    expect(
      Array.isArray(mod['notificationTypes']),
      '@/features/notifications must export the notificationTypes array',
    ).toBe(true)
  })
})
