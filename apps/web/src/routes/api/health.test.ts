import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPing = vi.fn()
const { capturedGet } = vi.hoisted(() => ({
  capturedGet: vi.fn<() => Promise<Response>>(),
}))

vi.mock('@bcordes/valkey', () => ({
  getValkey: vi.fn(() => ({ ping: mockPing })),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    (routeConfig: {
      server: { handlers: { GET: () => Promise<Response> } }
    }) => {
      capturedGet.mockImplementation(routeConfig.server.handlers.GET)
      return { options: routeConfig }
    },
}))

async function callHealthHandler(): Promise<Response> {
  await import('./health')
  return capturedGet()
}

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 200 with status "healthy" when Valkey ping returns PONG', async () => {
    mockPing.mockResolvedValue('PONG')

    const response = await callHealthHandler()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: 'healthy' })
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('returns 503 with "ping failed" when Valkey ping returns unexpected value', async () => {
    mockPing.mockResolvedValue('NOT_PONG')

    const response = await callHealthHandler()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'unhealthy', valkey: 'ping failed' })
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('returns 503 with "unreachable" when Valkey ping throws', async () => {
    mockPing.mockRejectedValue(new Error('Connection refused'))

    const response = await callHealthHandler()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'unhealthy', valkey: 'unreachable' })
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('returns 503 with "unreachable" when Valkey ping times out', async () => {
    mockPing.mockRejectedValue(new Error('ETIMEDOUT'))

    const response = await callHealthHandler()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'unhealthy', valkey: 'unreachable' })
  })

  it('returns 503 with "ping failed" when Valkey ping returns empty string', async () => {
    mockPing.mockResolvedValue('')

    const response = await callHealthHandler()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'unhealthy', valkey: 'ping failed' })
  })

  it('returns 503 with "ping failed" when Valkey ping returns null', async () => {
    mockPing.mockResolvedValue(null)

    const response = await callHealthHandler()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'unhealthy', valkey: 'ping failed' })
  })
})
