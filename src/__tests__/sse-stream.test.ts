import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for SSE stream proxy (src/routes/api/notifications/stream.ts).
 *
 * The stream route is a thin proxy that:
 *   1. Authenticates the user via session
 *   2. Fetches the backend SSE endpoint with the access token
 *   3. Pipes the upstream SSE response to the client
 *   4. Sends keepalive comments every 30s
 *   5. Attempts token refresh + reconnect when upstream closes
 */

/* ------------------------------------------------------------------ */
/*  Shared state for mocks                                             */
/* ------------------------------------------------------------------ */

let mockFetchResponse: {
  ok: boolean
  status: number
  statusText: string
  body: ReadableStream<Uint8Array> | null
}

let upstreamController: ReadableStreamDefaultController<Uint8Array>

function createUpstreamStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      upstreamController = controller
    },
  })
}

function enqueueUpstream(text: string) {
  upstreamController.enqueue(new TextEncoder().encode(text))
}

function closeUpstream() {
  upstreamController.close()
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('SSE stream proxy', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.WALLOW_API_URL = 'https://api.test.local'
    process.env.NODE_ENV = 'production'

    mockFetchResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      body: createUpstreamStream(),
    }
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
    vi.resetModules()
  })

  async function setupMocksAndImport(options?: {
    session?: Record<string, unknown> | null
    oidcRefreshToken?: () => Promise<unknown>
    fetchOverride?: () => Promise<typeof mockFetchResponse>
  }) {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn(() =>
        Promise.resolve(
          options && 'session' in options
            ? options.session
            : {
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token',
              },
        ),
      ),
    }))

    vi.doMock('@/lib/auth/oidc', () => ({
      refreshToken: vi.fn(
        options?.oidcRefreshToken ??
          (() =>
            Promise.resolve({
              accessToken: 'refreshed-access-token',
              refreshToken: 'refreshed-refresh-token',
            })),
      ),
    }))

    vi.doMock('@/lib/wallow/config', () => ({
      WALLOW_BASE_URL: 'https://api.test.local',
    }))

    const mockFetch = vi.fn(
      options?.fetchOverride ?? (() => Promise.resolve(mockFetchResponse)),
    )
    vi.stubGlobal('fetch', mockFetch)

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
    return { handler: capturedGetHandler!, mockFetch }
  }

  /* ---------------------------------------------------------------- */
  /*  Authentication                                                   */
  /* ---------------------------------------------------------------- */

  describe('authentication', () => {
    it('should return 401 when session is null', async () => {
      const { handler } = await setupMocksAndImport({ session: null })
      const response = await handler()

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })

    it('should return 401 when session has no accessToken', async () => {
      const { handler } = await setupMocksAndImport({
        session: { accessToken: null },
      })
      const response = await handler()

      expect(response.status).toBe(401)
    })

    it('should return 401 when session has empty accessToken', async () => {
      const { handler } = await setupMocksAndImport({
        session: { accessToken: '' },
      })
      const response = await handler()

      expect(response.status).toBe(401)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Successful connection                                            */
  /* ---------------------------------------------------------------- */

  describe('successful connection', () => {
    it('should return SSE response headers', async () => {
      const { handler } = await setupMocksAndImport()
      const response = await handler()

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')

      const reader = response.body!.getReader()
      reader.cancel()
    })

    it('should fetch upstream SSE endpoint with bearer token', async () => {
      const { handler, mockFetch } = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.local/api/v1/notifications/stream',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-access-token',
            Accept: 'text/event-stream',
          },
        }),
      )

      reader.cancel()
    })

    it('should send ": connected" comment after upstream connects', async () => {
      const { handler } = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()

      const { value } = await reader.read()
      const text = new TextDecoder().decode(value)
      expect(text).toBe(': connected\n\n')

      reader.cancel()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Event forwarding                                                 */
  /* ---------------------------------------------------------------- */

  describe('event forwarding', () => {
    it('should forward upstream SSE events to the client', async () => {
      const { handler } = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()

      // Consume ": connected"
      await reader.read()

      const envelope = {
        type: 'NotificationCreated',
        module: 'notifications',
        payload: { id: 1 },
        timestamp: '2026-03-25T00:00:00Z',
      }

      enqueueUpstream(
        `event: NotificationCreated\ndata: ${JSON.stringify(envelope)}\n\n`,
      )

      const { value } = await reader.read()
      const text = new TextDecoder().decode(value)
      expect(text).toContain('event: NotificationCreated\n')
      expect(text).toContain(`data: ${JSON.stringify(envelope)}\n\n`)

      reader.cancel()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Keepalive heartbeat                                              */
  /* ---------------------------------------------------------------- */

  describe('keepalive heartbeat', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should send keepalive comment every 30 seconds', async () => {
      const { handler } = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()

      // Consume ": connected"
      await reader.read()

      vi.advanceTimersByTime(30_000)

      const { value } = await reader.read()
      const text = new TextDecoder().decode(value)
      expect(text).toBe(': keepalive\n\n')

      reader.cancel()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Connection failure                                               */
  /* ---------------------------------------------------------------- */

  describe('connection failure', () => {
    it('should close stream when upstream fetch fails', async () => {
      const { handler } = await setupMocksAndImport({
        fetchOverride: () => Promise.reject(new Error('connection refused')),
      })
      const response = await handler()
      const reader = response.body!.getReader()

      const { done } = await reader.read()
      expect(done).toBe(true)
    })

    it('should close stream when upstream returns non-200', async () => {
      const { handler } = await setupMocksAndImport({
        fetchOverride: () =>
          Promise.resolve({
            ok: false,
            status: 502,
            statusText: 'Bad Gateway',
            body: null,
          }),
      })
      const response = await handler()
      const reader = response.body!.getReader()

      const { done } = await reader.read()
      expect(done).toBe(true)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Cancel / teardown                                                */
  /* ---------------------------------------------------------------- */

  describe('cancel / teardown', () => {
    it('should log disconnect when client cancels', async () => {
      const { handler } = await setupMocksAndImport()
      const response = await handler()
      const reader = response.body!.getReader()
      await reader.read()

      reader.cancel()

      expect(console.log).toHaveBeenCalledWith('[sse] client disconnected')
    })
  })

  /* ---------------------------------------------------------------- */
  /*  SseManager — SIGTERM drain                                       */
  /* ---------------------------------------------------------------- */

  describe('SseManager SIGTERM drain', () => {
    it('should send reconnect event to all open connections when SIGTERM fires', async () => {
      // Capture the SIGTERM handler via spy
      let sigtermHandler: (() => void) | undefined
      const onceSpy = vi
        .spyOn(process, 'once')
        .mockImplementation(
          (event: string, handler: (...args: Array<unknown>) => void) => {
            if (event === 'SIGTERM') {
              sigtermHandler = handler as () => void
            }
            return process
          },
        )

      const { handler } = await setupMocksAndImport()

      // Install the SIGTERM handler
      const { installSigtermHandler, sseManager } =
        await import('@/routes/api/notifications/stream')
      installSigtermHandler()

      expect(onceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))

      // Open two SSE connections
      const response1 = await handler()
      const reader1 = response1.body!.getReader()
      await reader1.read() // consume ": connected"

      // Create a second upstream for the second connection
      mockFetchResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        body: createUpstreamStream(),
      }
      const response2 = await handler()
      const reader2 = response2.body!.getReader()
      await reader2.read() // consume ": connected"

      // Fire SIGTERM
      sigtermHandler!()

      // Both streams should receive a reconnect SSE event
      const { value: val1 } = await reader1.read()
      const text1 = new TextDecoder().decode(val1)
      expect(text1).toContain('event: reconnect')

      const { value: val2 } = await reader2.read()
      const text2 = new TextDecoder().decode(val2)
      expect(text2).toContain('event: reconnect')

      reader1.cancel()
      reader2.cancel()
    })

    it('should return 503 for new connections while drain is in progress', async () => {
      vi.spyOn(process, 'once').mockImplementation(() => process)

      const { handler } = await setupMocksAndImport()

      // Import and trigger drain
      const { sseManager } = await import('@/routes/api/notifications/stream')
      sseManager.drain()

      expect(sseManager.draining).toBe(true)

      // New connection should be rejected with 503
      const response = await handler()
      expect(response.status).toBe(503)
    })

    it('should send reconnect event and close stream after 4 hours', async () => {
      vi.useFakeTimers()
      vi.spyOn(process, 'once').mockImplementation(() => process)

      try {
        const { handler } = await setupMocksAndImport()
        const { MAX_STREAM_DURATION_MS } =
          await import('@/routes/api/notifications/stream')

        const response = await handler()
        const reader = response.body!.getReader()
        await reader.read() // consume ": connected"

        // Advance time by 4 hours
        vi.advanceTimersByTime(MAX_STREAM_DURATION_MS)

        // Should receive a reconnect event
        const { value } = await reader.read()
        const text = new TextDecoder().decode(value)
        expect(text).toContain('event: reconnect')

        // Stream should close after the reconnect event
        const { done } = await reader.read()
        expect(done).toBe(true)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
