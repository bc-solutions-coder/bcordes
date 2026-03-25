import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LogLevel } from '@microsoft/signalr'

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
  onHandlers: Map<string, Array<(...args: Array<unknown>) => void>>
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
    on: vi.fn((method: string, handler: (...args: Array<unknown>) => void) => {
      const existing = calls.onHandlers.get(method) ?? []
      existing.push(handler)
      calls.onHandlers.set(method, existing)
    }),
    onclose: vi.fn((cb: () => Promise<void>) => {
      calls.oncloseCallback = cb
    }),
    start: vi.fn(() => {
      calls.started = true
      return Promise.resolve()
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
      const actual = await vi.importActual<typeof import('@microsoft/signalr')>( // eslint-disable-line @typescript-eslint/consistent-type-imports
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
      getSession: vi.fn(() =>
        Promise.resolve({
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: 'usr_abc123-secret-id',
            name: 'Test User',
            email: 'test@test.com',
          },
        }),
      ),
    }))

    vi.doMock('~/lib/auth/oidc', () => ({
      refreshToken: vi.fn(() =>
        Promise.resolve({
          accessToken: 'refreshed-access-token',
          refreshToken: 'refreshed-refresh-token',
        }),
      ),
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
      const usesSharedRegistration = oncloseBlock.includes(
        'registerHubHandlers(reconnectedHub',
      )

      if (usesSharedRegistration) {
        // Verify that HUB_EVENTS contains all 3 events
        const hubEventsMatch = source.match(
          /const HUB_EVENTS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/,
        )
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
        .map((args: Array<unknown>) => args.join(' '))
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

/* ------------------------------------------------------------------ */
/*  Connection lifecycle, auth, heartbeat, error handling               */
/* ------------------------------------------------------------------ */

describe('SSE stream — connection lifecycle and coverage gaps', () => {
  const originalEnv = process.env.NODE_ENV

  let lifecyclePrimaryBuilder: BuilderCalls
  let fakeHubInstance: ReturnType<typeof makeFakeHub>
  let reconnectedBuilder: BuilderCalls
  let reconnectedHubInstance: ReturnType<typeof makeFakeHub>
  let hubBuildCount: number

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.WALLOW_API_URL = 'https://api.test.local'
    process.env.NODE_ENV = 'production'
    lifecyclePrimaryBuilder = createBuilderCalls()
    reconnectedBuilder = createBuilderCalls()
    fakeHubInstance = makeFakeHub(lifecyclePrimaryBuilder)
    reconnectedHubInstance = makeFakeHub(reconnectedBuilder)
    hubBuildCount = 0
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
    vi.resetModules()
  })

  function setupMocksAndImport(options?: {
    session?: Record<string, unknown> | null
    oidcRefreshToken?: () => Promise<unknown>
  }) {
    hubBuildCount = 0

    vi.doMock('@microsoft/signalr', async () => {
      const actual = await vi.importActual<typeof import('@microsoft/signalr')>( // eslint-disable-line @typescript-eslint/consistent-type-imports
        '@microsoft/signalr',
      )
      return {
        ...actual,
        HubConnectionBuilder: vi.fn().mockImplementation(() => {
          const isFirst = hubBuildCount === 0
          hubBuildCount++
          const calls = isFirst ? lifecyclePrimaryBuilder : reconnectedBuilder
          const hub = isFirst ? fakeHubInstance : reconnectedHubInstance
          return {
            withUrl: vi.fn().mockReturnThis(),
            withAutomaticReconnect: vi.fn().mockReturnThis(),
            configureLogging: vi.fn((level: LogLevel) => {
              calls.configureLoggingLevel = level
              return { build: vi.fn(() => hub) }
            }),
          }
        }),
      }
    })

    const defaultSession = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: { id: 'usr_123', name: 'Test User', email: 'test@test.com' },
    }

    const sessionValue =
      options && 'session' in options ? options.session : defaultSession

    vi.doMock('~/lib/auth/session', () => ({
      getSession: vi.fn(() => Promise.resolve(sessionValue)),
    }))

    const defaultRefresh = () =>
      Promise.resolve({
        accessToken: 'refreshed-access-token',
        refreshToken: 'refreshed-refresh-token',
      })

    vi.doMock('~/lib/auth/oidc', () => ({
      refreshToken: vi.fn(options?.oidcRefreshToken ?? defaultRefresh),
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

    // Need dynamic import to pick up doMock
    return import('@/routes/api/notifications/stream').then(
      () => capturedGetHandler!,
    )
  }

  /** Read all currently available chunks from a ReadableStream reader */
  async function drainAvailable(
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): Promise<string> {
    const decoder = new TextDecoder()
    let result = ''
    // Read chunks that are already enqueued
    const { value, done } = await reader.read()
    if (!done) result += decoder.decode(value)
    return result
  }

  /* ---------------------------------------------------------------- */
  /*  5. Auth — returns 401 when no session                            */
  /* ---------------------------------------------------------------- */

  describe('authentication', () => {
    it('should return 401 when session is null', async () => {
      const handler = await setupMocksAndImport({ session: null })
      const response = await handler()

      expect(response.status).toBe(401)
      const body = await response.text()
      expect(body).toBe('Unauthorized')
    })

    it('should return 401 when session has no accessToken', async () => {
      const handler = await setupMocksAndImport({
        session: { accessToken: null },
      })
      const response = await handler()

      expect(response.status).toBe(401)
    })

    it('should return 401 when session has empty accessToken', async () => {
      const handler = await setupMocksAndImport({
        session: { accessToken: '' },
      })
      const response = await handler()

      expect(response.status).toBe(401)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  6. Successful connection — response headers and connected event  */
  /* ---------------------------------------------------------------- */

  describe('successful connection', () => {
    it('should return SSE response headers', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')

      // Cleanup
      const reader = response.body!.getReader()
      await reader.read()
      reader.cancel()
    })

    it('should send ": connected" comment after hub.start()', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()

      const firstChunk = await drainAvailable(reader)
      expect(firstChunk).toBe(': connected\n\n')

      reader.cancel()
    })

    it('should register all HUB_EVENTS handlers on the hub', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      expect(
        lifecyclePrimaryBuilder.onHandlers.has('ReceiveNotifications'),
      ).toBe(true)
      expect(
        lifecyclePrimaryBuilder.onHandlers.has('ReceiveNotification'),
      ).toBe(true)
      expect(lifecyclePrimaryBuilder.onHandlers.has('ReceivePresence')).toBe(
        true,
      )

      reader.cancel()
    })

    it('should call hub.start()', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      expect(fakeHubInstance.start).toHaveBeenCalledOnce()

      reader.cancel()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  7. SSE event forwarding                                          */
  /* ---------------------------------------------------------------- */

  describe('event forwarding', () => {
    it('should format and forward hub events as SSE', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()

      // Consume the ": connected" comment
      await reader.read()

      // Trigger a hub event
      const handlers = lifecyclePrimaryBuilder.onHandlers.get(
        'ReceiveNotification',
      )!
      const envelope = {
        type: 'notification',
        module: 'inquiries',
        payload: { id: 1, message: 'hello' },
      }
      handlers[0](envelope)

      const chunk = await drainAvailable(reader)
      expect(chunk).toContain('event: notification\n')
      expect(chunk).toContain(`data: ${JSON.stringify(envelope)}\n\n`)

      reader.cancel()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  8. Keepalive heartbeat                                           */
  /* ---------------------------------------------------------------- */

  describe('keepalive heartbeat', () => {
    it('should send keepalive comment every 30 seconds', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()

      // Consume the ": connected" comment
      await reader.read()

      // Advance timer by 30s to trigger first keepalive
      vi.advanceTimersByTime(30_000)

      const chunk = await drainAvailable(reader)
      expect(chunk).toBe(': keepalive\n\n')

      reader.cancel()
    })

    it('should not send keepalive after stream is cancelled', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()

      await reader.read()

      // Cancel the stream (triggers cancel())
      reader.cancel()

      // Advance timers — keepalive should be a no-op
      // This should not throw even though the controller is closed
      vi.advanceTimersByTime(30_000)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  9. Connection failure                                            */
  /* ---------------------------------------------------------------- */

  describe('connection failure', () => {
    it('should close the stream when hub.start() fails', async () => {
      fakeHubInstance.start.mockRejectedValueOnce(
        new Error('connection refused'),
      )

      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()

      // The stream should close (done: true) without sending ": connected"
      const { done } = await reader.read()
      expect(done).toBe(true)
    })

    it('should log error when hub.start() fails', async () => {
      const connError = new Error('connection refused')
      fakeHubInstance.start.mockRejectedValueOnce(connError)

      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      expect(console.error).toHaveBeenCalledWith(
        '[sse] hub connection failed',
        connError,
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /*  10. Cancel / teardown                                            */
  /* ---------------------------------------------------------------- */

  describe('cancel / teardown', () => {
    it('should stop the hub when the client disconnects', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      reader.cancel()

      // Allow microtasks to flush
      await vi.advanceTimersByTimeAsync(0)

      expect(fakeHubInstance.stop).toHaveBeenCalledOnce()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  11. Reconnection on hub close                                    */
  /* ---------------------------------------------------------------- */

  describe('reconnection on hub close', () => {
    it('should refresh token and start a new hub when connection closes', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      // Trigger onclose callback
      expect(lifecyclePrimaryBuilder.oncloseCallback).not.toBeNull()
      await lifecyclePrimaryBuilder.oncloseCallback!()

      expect(reconnectedHubInstance.start).toHaveBeenCalledOnce()
      // Verify events are registered on the reconnected hub
      expect(reconnectedBuilder.onHandlers.has('ReceiveNotifications')).toBe(
        true,
      )
      expect(reconnectedBuilder.onHandlers.has('ReceiveNotification')).toBe(
        true,
      )
      expect(reconnectedBuilder.onHandlers.has('ReceivePresence')).toBe(true)

      reader.cancel()
    })

    it('should not reconnect if no refreshToken is available', async () => {
      const handler = await setupMocksAndImport({
        session: {
          accessToken: 'test-access-token',
          refreshToken: null,
          user: { id: 'usr_123', name: 'Test User', email: 'test@test.com' },
        },
      })
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      // Trigger onclose
      await lifecyclePrimaryBuilder.oncloseCallback!()

      // No reconnection attempted — only 1 hub was built
      expect(hubBuildCount).toBe(1)

      reader.cancel()
    })

    it('should not reconnect if stream is already closed', async () => {
      const handler = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      // Cancel first (sets closed = true)
      reader.cancel()
      await vi.advanceTimersByTimeAsync(0)

      // Trigger onclose after cancel — should be a no-op
      await lifecyclePrimaryBuilder.oncloseCallback!()

      expect(hubBuildCount).toBe(1)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  12. Reconnection failure                                         */
  /* ---------------------------------------------------------------- */

  describe('reconnection failure', () => {
    it('should close the stream when token refresh fails', async () => {
      const handler = await setupMocksAndImport({
        oidcRefreshToken: () => Promise.reject(new Error('refresh failed')),
      })
      const response = await handler()
      const reader = response.body!.getReader()

      // Consume connected comment
      await reader.read()

      // Trigger onclose → refreshToken will fail → controller.close()
      await lifecyclePrimaryBuilder.oncloseCallback!()

      // Stream should now be closed
      const { done } = await reader.read()
      expect(done).toBe(true)
    })
  })
})
