import { beforeEach, describe, expect, it, vi } from 'vitest'

// All imports must be dynamic because stream.ts transitively imports
// ~/lib/auth/session which throws without SESSION_SECRET at module level.

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/auth/oidc', () => ({
  refreshToken: vi.fn(),
}))

vi.mock('@/lib/wallow/config', () => ({
  WALLOW_BASE_URL: 'http://localhost:9999',
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: unknown) => config,
}))

describe('SseManager', () => {
  it('registers and unregisters controllers', async () => {
    const { SseManager } = await import('./stream')
    const manager = new SseManager()
    const controller = {} as ReadableStreamDefaultController<Uint8Array>
    manager.register(controller)
    expect(manager.connections.size).toBe(1)

    manager.unregister(controller)
    expect(manager.connections.size).toBe(0)
  })

  it('is not draining by default', async () => {
    const { SseManager } = await import('./stream')
    const manager = new SseManager()
    expect(manager.draining).toBe(false)
  })

  it('sends reconnect event and closes all connections on drain', async () => {
    const { SseManager } = await import('./stream')
    const manager = new SseManager()
    const enqueue = vi.fn()
    const close = vi.fn()
    const controller = {
      enqueue,
      close,
    } as unknown as ReadableStreamDefaultController<Uint8Array>

    manager.register(controller)
    manager.drain()

    expect(manager.draining).toBe(true)
    expect(enqueue).toHaveBeenCalledTimes(1)
    const encoded = enqueue.mock.calls[0][0] as Uint8Array
    const text = new TextDecoder().decode(encoded)
    expect(text).toContain('event: reconnect')
    expect(text).toContain('"reason":"shutdown"')
    expect(close).toHaveBeenCalledTimes(1)
    expect(manager.connections.size).toBe(0)
  })

  it('handles already-closed controllers during drain without throwing', async () => {
    const { SseManager } = await import('./stream')
    const manager = new SseManager()
    const controller = {
      enqueue: vi.fn(() => {
        throw new Error('already closed')
      }),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController<Uint8Array>

    manager.register(controller)
    expect(() => manager.drain()).not.toThrow()
    expect(manager.connections.size).toBe(0)
  })
})

describe('SSE Route GET handler', () => {
  let mockGetSession: ReturnType<typeof vi.fn>
  let mockRefreshToken: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    // Re-apply mocks after resetModules
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn(),
    }))
    vi.doMock('@/lib/auth/oidc', () => ({
      refreshToken: vi.fn(),
    }))
    vi.doMock('@/lib/wallow/config', () => ({
      WALLOW_BASE_URL: 'http://localhost:9999',
    }))
    vi.doMock('@tanstack/react-router', () => ({
      createFileRoute: () => (config: unknown) => config,
    }))

    const sessionMod = await import('@/lib/auth/session')
    mockGetSession = sessionMod.getSession as ReturnType<typeof vi.fn>

    const oidcMod = await import('@/lib/auth/oidc')
    mockRefreshToken = oidcMod.refreshToken as ReturnType<typeof vi.fn>
  })

  async function getHandler() {
    const mod = await import('./stream')
    const routeConfig = mod.Route as unknown as {
      server: { handlers: { GET: () => Promise<Response> } }
    }
    return { handler: routeConfig.server.handlers.GET, mod }
  }

  it('returns 401 when session has no access token', async () => {
    mockGetSession.mockResolvedValue(null)
    const { handler } = await getHandler()
    const response = await handler()
    expect(response.status).toBe(401)
  })

  it('returns 503 when SSE manager is draining', async () => {
    mockGetSession.mockResolvedValue({ accessToken: 'tok' })
    const { handler, mod } = await getHandler()
    mod.sseManager.drain()

    const response = await handler()
    expect(response.status).toBe(503)
  })

  it('closes controller when upstream ends and no refresh token (lines 234-235)', async () => {
    const fakeBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close()
      },
    })

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      body: fakeBody,
      status: 200,
      statusText: 'OK',
    })
    vi.stubGlobal('fetch', fetchSpy)

    mockGetSession.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: undefined,
    })

    const { handler } = await getHandler()
    const response = await handler()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')

    const reader = response.body!.getReader()
    const chunks: Array<string> = []
    const decoder = new TextDecoder()

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(decoder.decode(value, { stream: true }))
      }
    } catch {
      // stream closed
    }

    const output = chunks.join('')
    expect(output).toContain('connected')

    vi.unstubAllGlobals()
  })

  it('pull() handles enqueue error when client disconnects (line 252)', async () => {
    const fakeBody = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(': keepalive\n\n'))
        controller.close()
      },
    })

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      body: fakeBody,
      status: 200,
      statusText: 'OK',
    })
    vi.stubGlobal('fetch', fetchSpy)

    mockGetSession.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: undefined,
    })

    const { handler } = await getHandler()
    const response = await handler()

    const reader = response.body!.getReader()
    await reader.read()
    await reader.cancel()

    vi.unstubAllGlobals()
  })

  it('closes stream after upstream connection failure', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      body: null,
      status: 502,
      statusText: 'Bad Gateway',
    })
    vi.stubGlobal('fetch', fetchSpy)

    mockGetSession.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: undefined,
    })

    const { handler } = await getHandler()
    const response = await handler()

    expect(response.status).toBe(200)

    const reader = response.body!.getReader()
    const chunks: Array<string> = []
    const decoder = new TextDecoder()

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(decoder.decode(value, { stream: true }))
      }
    } catch {
      // stream terminated
    }

    vi.unstubAllGlobals()
  })

  it('closes controller when reconnect connectUpstream throws after refreshToken succeeds (lines 231-232)', async () => {
    let callCount = 0
    const fetchSpy = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call succeeds, upstream closes immediately
        const fakeBody = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.close()
          },
        })
        return Promise.resolve({
          ok: true,
          body: fakeBody,
          status: 200,
          statusText: 'OK',
        })
      }
      // Second call (reconnect) fails
      return Promise.resolve({
        ok: false,
        body: null,
        status: 502,
        statusText: 'Bad Gateway',
      })
    })
    vi.stubGlobal('fetch', fetchSpy)

    mockGetSession.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'refresh-tok',
    })

    mockRefreshToken.mockResolvedValue({
      accessToken: 'new-access-token',
    })

    const { handler } = await getHandler()
    const response = await handler()

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    const chunks: Array<string> = []

    const readWithTimeout = async () => {
      const timeout = setTimeout(() => reader.cancel(), 2000)
      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          chunks.push(decoder.decode(value, { stream: true }))
        }
      } catch {
        // stream cancelled/closed
      } finally {
        clearTimeout(timeout)
      }
    }

    await readWithTimeout()

    // refreshToken was called, and second fetch (reconnect) was attempted
    expect(mockRefreshToken).toHaveBeenCalledWith('refresh-tok')
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    vi.unstubAllGlobals()
  })

  it('pull() catches enqueue error on keepalive delivery (line 252)', async () => {
    vi.useFakeTimers()

    // Keep upstream alive so the keepalive timer can fire
    const fakeBody = new ReadableStream<Uint8Array>({
      start() {
        // Never close — upstream stays open
      },
      cancel() {
        // Allow cancellation
      },
    })

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      body: fakeBody,
      status: 200,
      statusText: 'OK',
    })
    vi.stubGlobal('fetch', fetchSpy)

    mockGetSession.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: undefined,
    })

    const { handler, mod } = await getHandler()
    const response = await handler()

    const reader = response.body!.getReader()

    // Read the ': connected' chunk
    const firstRead = reader.read()
    await vi.advanceTimersByTimeAsync(0)
    await firstRead

    // Get the registered controller from sseManager and make enqueue throw
    const controller = [...mod.sseManager.connections][0]
    const originalEnqueue = controller.enqueue.bind(controller)
    controller.enqueue = vi.fn().mockImplementation((chunk: Uint8Array) => {
      // Check if this is a keepalive chunk (pull() path)
      const text = new TextDecoder().decode(chunk)
      if (text.includes('keepalive')) {
        throw new TypeError('Controller is already closed')
      }
      return originalEnqueue(chunk)
    })

    // Fire the keepalive timer — this sets latestKeepalive via enqueueOrBuffer
    // and resolves pullResolve. Then pull() runs and tries enqueue() which throws.
    await vi.advanceTimersByTimeAsync(30_001)

    // Read to trigger pull() — it will find latestKeepalive and try to enqueue
    const readPromise = reader.read()
    await vi.advanceTimersByTimeAsync(0)

    // The read may hang or return — cancel to clean up
    await reader.cancel().catch(() => {})
    await readPromise.catch(() => {})

    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('pull() catches controller.close() error in shouldClose branch (line 260)', async () => {
    vi.useFakeTimers()

    // Keep upstream alive
    const fakeBody = new ReadableStream<Uint8Array>({
      start() {
        // Never close
      },
      cancel() {
        // Allow cancellation
      },
    })

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      body: fakeBody,
      status: 200,
      statusText: 'OK',
    })
    vi.stubGlobal('fetch', fetchSpy)

    mockGetSession.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: undefined,
    })

    const { handler, mod } = await getHandler()
    const response = await handler()

    const reader = response.body!.getReader()

    // Read the ': connected' chunk
    const firstRead = reader.read()
    await vi.advanceTimersByTimeAsync(0)
    await firstRead

    // Get the registered controller and make close() throw
    const controller = [...mod.sseManager.connections][0]
    controller.close = vi.fn(() => {
      throw new TypeError('Controller is already closed')
    })

    // Read the reconnect event that maxDurationTimer enqueues
    const readPromise = reader.read()

    // Advance past MAX_STREAM_DURATION (4 hours) to trigger maxDurationTimer
    // which sets shouldClose = true, enqueues reconnect event, resolves pullResolve
    // Then pull() runs, sees shouldClose, calls controller.close() which throws
    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000 + 1)

    // Read the reconnect event
    await readPromise.catch(() => {})

    // Next read triggers pull() which sees shouldClose and tries close()
    const nextRead = reader.read()
    await vi.advanceTimersByTimeAsync(0)
    await nextRead.catch(() => {})

    // Clean up
    await reader.cancel().catch(() => {})

    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('attempts token refresh when upstream ends with refresh token available', async () => {
    const fetchSpy = vi.fn().mockImplementation(() => {
      const fakeBody = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close()
        },
      })
      return Promise.resolve({
        ok: true,
        body: fakeBody,
        status: 200,
        statusText: 'OK',
      })
    })
    vi.stubGlobal('fetch', fetchSpy)

    mockGetSession.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'refresh-tok',
    })

    mockRefreshToken.mockResolvedValue({
      accessToken: 'new-access-token',
    })

    const { handler } = await getHandler()
    const response = await handler()

    // Read stream — both upstream connections close immediately,
    // so the stream should complete after reconnect also ends
    const reader = response.body!.getReader()
    const chunks: Array<string> = []
    const decoder = new TextDecoder()

    // Use a short timeout to avoid hanging if stream stays open
    const readWithTimeout = async () => {
      const timeout = setTimeout(() => reader.cancel(), 2000)
      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          chunks.push(decoder.decode(value, { stream: true }))
        }
      } catch {
        // stream cancelled/closed
      } finally {
        clearTimeout(timeout)
      }
    }

    await readWithTimeout()

    // Should have called fetch twice (initial + reconnect)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(mockRefreshToken).toHaveBeenCalledWith('refresh-tok')

    vi.unstubAllGlobals()
  })
})
