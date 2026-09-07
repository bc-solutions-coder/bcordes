import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const appSrc = join(repoRoot, 'apps/web/src')
const featureDir = join(appSrc, 'features/notifications')
const featureIndex = join(featureDir, 'index.ts')
const featureComponents = join(featureDir, 'components')
const featureHooks = join(featureDir, 'hooks')
const featureLib = join(featureDir, 'lib')
const featureServerFns = join(featureDir, 'server-fns')

const COMPONENT_EXPORTS = ['NotificationBell', 'NotificationRow'] as const

const HOOK_EXPORTS = [
  'EventStreamProvider',
  'useEventStream',
  'useEventStreamEvents',
  'useNotificationFilters',
  'notificationTypes',
  'useNotificationSelection',
  'usePushNotifications',
] as const

const LIB_EXPORTS = ['invalidateNotifications', 'getNotificationRoute'] as const

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

const TYPE_EXPORTS = [
  ['EventStreamContextValue', 'hooks'],
  ['NotificationType', 'hooks'],
] as const

const REEXPORTS = [
  ...COMPONENT_EXPORTS.map((name) => [name, 'components'] as const),
  ...HOOK_EXPORTS.map((name) => [name, 'hooks'] as const),
  ...LIB_EXPORTS.map((name) => [name, 'lib'] as const),
  ...SERVER_FN_EXPORTS.map((name) => [name, 'server-fns'] as const),
]

// Keep paths split to avoid matching this test in sibling source scans.
// The useEventStream prefix also matches useEventStreamEvents.
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

// Mock server dependencies so the public module can load without a server runtime.
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
      // Allow grouped exports and either quote style.
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
    // Keep the specifier nonliteral so missing exports fail at runtime, not during Vite transformation.
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

    expect(
      Array.isArray(mod['notificationTypes']),
      '@/features/notifications must export the notificationTypes array',
    ).toBe(true)
  })
})
