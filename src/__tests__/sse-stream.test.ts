import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { LogLevel } from '@microsoft/signalr'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Tests for SSE stream (src/routes/api/notifications/stream.ts).
 *
 * Issues in the current implementation that these tests expose:
 *   1. LogLevel.Debug is hardcoded — should be LogLevel.Warning in production
 *   2. hub.on monkey-patch logs all payloads unconditionally (should be dev-only)
 *   3. console.log leaks user ID on connection
 *   4. After reconnection, only 2 of 3 listeners are re-registered
 */

/* ------------------------------------------------------------------ */
/*  Shared state for mocks                                             */
/* ------------------------------------------------------------------ */

interface BuilderCalls {
  configureLoggingLevel: LogLevel | null
  onHandlers: Map<string, Array<(...args: unknown[]) => void>>
  oncloseCallback: (() => Promise<void>) | null
  started: boolean
}

function createBuilderCalls(): BuilderCalls {
  return {
    configureLoggingLevel: null,
    onHandlers: new Map(),
    oncloseCallback: null,
    started: false,
  }
}

let primaryBuilder: BuilderCalls

function makeFakeHub(calls: BuilderCalls) {
  return {
    on: vi.fn((method: string, handler: (...args: unknown[]) => void) => {
      const existing = calls.onHandlers.get(method) ?? []
      existing.push(handler)
      calls.onHandlers.set(method, existing)
    }),
    onclose: vi.fn((cb: () => Promise<void>) => {
      calls.oncloseCallback = cb
    }),
    start: vi.fn(async () => {
      calls.started = true
    }),
    stop: vi.fn(),
  }
}

/* ------------------------------------------------------------------ */
/*  Source file path for static analysis tests                         */
/* ------------------------------------------------------------------ */

const SOURCE_PATH = resolve(
  __dirname,
  '..',
  'routes',
  'api',
  'notifications',
  'stream.ts',
)

function readSource(): string {
  return readFileSync(SOURCE_PATH, 'utf-8')
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('SSE stream — debug logging and log sanitization', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.WALLOW_API_URL = 'https://api.test.local'
    primaryBuilder = createBuilderCalls()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
    vi.resetModules()
  })

  async function setupMocksAndImport() {
    // Register fresh mocks before each dynamic import
    vi.doMock('@microsoft/signalr', async () => {
      const actual = await vi.importActual<typeof import('@microsoft/signalr')>(
        '@microsoft/signalr',
      )
      return {
        ...actual,
        HubConnectionBuilder: vi.fn().mockImplementation(() => {
          const hub = makeFakeHub(primaryBuilder)
          return {
            withUrl: vi.fn().mockReturnThis(),
            withAutomaticReconnect: vi.fn().mockReturnThis(),
            configureLogging: vi.fn((level: LogLevel) => {
              primaryBuilder.configureLoggingLevel = level
              return {
                build: vi.fn(() => hub),
              }
            }),
          }
        }),
      }
    })

    vi.doMock('~/lib/auth/session', () => ({
      getSession: vi.fn(async () => ({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: {
          id: 'usr_abc123-secret-id',
          name: 'Test User',
          email: 'test@test.com',
        },
      })),
    }))

    vi.doMock('~/lib/auth/oidc', () => ({
      refreshToken: vi.fn(async () => ({
        accessToken: 'refreshed-access-token',
        refreshToken: 'refreshed-refresh-token',
      })),
    }))

    let capturedGetHandler: (() => Promise<Response>) | null = null

    vi.doMock('@tanstack/react-router', () => ({
      createFileRoute: () => (routeConfig: Record<string, unknown>) => {
        const server = routeConfig.server as {
          handlers: { GET: () => Promise<Response> }
        }
        capturedGetHandler = server.handlers.GET
        return { Route: routeConfig }
      },
    }))

    await import('@/routes/api/notifications/stream')
    return capturedGetHandler!
  }

  async function invokeHandler(handler: () => Promise<Response>) {
    const response = await handler()
    const reader = response.body!.getReader()
    await reader.read()
    reader.cancel()
    return response
  }

  /* ---------------------------------------------------------------- */
  /*  1. LogLevel should be environment-aware                          */
  /* ---------------------------------------------------------------- */

  describe('LogLevel in production', () => {
    it('should use LogLevel.Warning (not Debug) when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production'
      const handler = await setupMocksAndImport()
      await invokeHandler(handler)

      expect(primaryBuilder.configureLoggingLevel).toBe(LogLevel.Warning)
    })

    it('should use LogLevel.Debug in development', async () => {
      process.env.NODE_ENV = 'development'
      const handler = await setupMocksAndImport()
      await invokeHandler(handler)

      expect(primaryBuilder.configureLoggingLevel).toBe(LogLevel.Debug)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  2. Reconnection must re-register all 3 event listeners           */
  /* ---------------------------------------------------------------- */

  describe('reconnection event listener registration', () => {
    it('should register all 3 event listeners on the reconnected hub', () => {
      // Static analysis: the onclose handler should re-register hub handlers.
      // After refactoring, registrations are done via registerHubHandlers()
      // which iterates over the HUB_EVENTS constant.
      const source = readSource()

      const oncloseStart = source.indexOf('hub.onclose(')
      expect(oncloseStart).toBeGreaterThan(-1)

      const oncloseBlock = source.slice(
        oncloseStart,
        source.indexOf('await hub.start()'),
      )

      // After refactoring, the onclose handler uses registerHubHandlers
      // instead of individual .on() calls — verify that call exists
      const usesSharedRegistration =
        oncloseBlock.includes('registerHubHandlers(reconnectedHub')

      if (usesSharedRegistration) {
        // Verify that HUB_EVENTS contains all 3 events
        const hubEventsMatch = source.match(/const HUB_EVENTS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/)
        expect(hubEventsMatch).not.toBeNull()
        const eventsBlock = hubEventsMatch![1]
        expect(eventsBlock).toContain('ReceiveNotifications')
        expect(eventsBlock).toContain('ReceiveNotification')
        expect(eventsBlock).toContain('ReceivePresence')
      } else {
        // Fallback: check for individual .on() registrations
        const registeredEvents = [
          ...oncloseBlock.matchAll(/reconnectedHub\.on\(\s*['"](\w+)['"]/g),
        ].map((m) => m[1])

        expect(registeredEvents).toContain('ReceiveNotifications')
        expect(registeredEvents).toContain('ReceiveNotification')
        expect(registeredEvents).toContain('ReceivePresence')
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /*  3. console.log must not contain user ID                          */
  /* ---------------------------------------------------------------- */

  describe('log sanitization — no user ID in logs', () => {
    it('should not log user ID via console.log during connection', async () => {
      process.env.NODE_ENV = 'production'
      const handler = await setupMocksAndImport()
      await invokeHandler(handler)

      const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
      const allLogContent = logCalls
        .map((args: unknown[]) => args.join(' '))
        .join('\n')

      expect(allLogContent).not.toContain('usr_abc123-secret-id')
    })
  })

  /* ---------------------------------------------------------------- */
  /*  4. hub.on monkey-patch must be dev-only or removed               */
  /* ---------------------------------------------------------------- */

  describe('hub.on monkey-patch removal in production', () => {
    it('should not contain an unconditional hub.on monkey-patch', () => {
      const source = readSource()

      const hasMonkeyPatch = source.includes('const origOn = hub.on.bind(hub)')

      if (hasMonkeyPatch) {
        // If it exists, it must be wrapped in a dev-only guard
        const isDevGuarded =
          source.includes("process.env.NODE_ENV !== 'production'") ||
          source.includes("process.env.NODE_ENV === 'production'") ||
          source.includes("process.env.NODE_ENV === 'development'")
        expect(isDevGuarded).toBe(true)
      } else {
        // Monkey-patch removed entirely — pass
        expect(hasMonkeyPatch).toBe(false)
      }
    })
  })
})
