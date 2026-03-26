import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock WallowClient
// ---------------------------------------------------------------------------

/**
 * Shape matching the WallowClient interface from `@/lib/wallow/client.ts`,
 * extended with `head` for convenience, where every method is a Vitest mock.
 */
export interface MockWallowClient {
  get: ReturnType<typeof vi.fn<(path: string) => Promise<Response>>>
  post: ReturnType<
    typeof vi.fn<(path: string, body?: unknown) => Promise<Response>>
  >
  put: ReturnType<
    typeof vi.fn<(path: string, body?: unknown) => Promise<Response>>
  >
  patch: ReturnType<
    typeof vi.fn<(path: string, body?: unknown) => Promise<Response>>
  >
  delete: ReturnType<typeof vi.fn<(path: string) => Promise<Response>>>
  head: ReturnType<typeof vi.fn<(path: string) => Promise<Response>>>
}

/**
 * Create a mock Wallow client whose methods are all `vi.fn()` stubs.
 *
 * By default every method resolves with a 200 JSON response (`{}`).
 * Override individual methods via `mockResolvedValue` / `mockImplementation`.
 */
export function createMockWallowClient(): MockWallowClient {
  const defaultResponse = () => Promise.resolve(jsonResponse({}))

  return {
    get: vi
      .fn<(path: string) => Promise<Response>>()
      .mockImplementation(defaultResponse),
    post: vi
      .fn<(path: string, body?: unknown) => Promise<Response>>()
      .mockImplementation(defaultResponse),
    put: vi
      .fn<(path: string, body?: unknown) => Promise<Response>>()
      .mockImplementation(defaultResponse),
    patch: vi
      .fn<(path: string, body?: unknown) => Promise<Response>>()
      .mockImplementation(defaultResponse),
    delete: vi
      .fn<(path: string) => Promise<Response>>()
      .mockImplementation(defaultResponse),
    head: vi
      .fn<(path: string) => Promise<Response>>()
      .mockImplementation(defaultResponse),
  }
}

// ---------------------------------------------------------------------------
// Response factories
// ---------------------------------------------------------------------------

/**
 * Build a `Response` containing a JSON body — the same shape the real Wallow
 * client returns on success.
 *
 * @param data  - Serialisable value that will become the response body.
 * @param status - HTTP status code (defaults to `200`).
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Build a `Response` containing a plain-text body.
 *
 * @param body   - String body.
 * @param status - HTTP status code (defaults to `200`).
 */
export function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  })
}
