import { vi } from 'vitest'

/** Legacy HTTP-method fixtures returning Response objects. */
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

/** Each method defaults to a 200 JSON response containing an empty object. */
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

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  })
}
