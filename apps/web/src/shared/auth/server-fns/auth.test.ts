import { ZodError } from 'zod'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWallowSdk } from '@bc-solutions-coder/sdk'
import { createMockSession } from '@bcordes/auth/testing'
import { getSession } from '@bcordes/auth/session'
import { createRequestSdk } from '@bcordes/auth/sdk'

vi.mock('@bcordes/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@bcordes/auth/sdk', () => ({ createRequestSdk: vi.fn() }))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    let validate = (input: unknown) => input
    const chain = {
      inputValidator: (validator: { parse: (input: unknown) => unknown }) => {
        validate = (input) => validator.parse(input)
        return chain
      },
      handler:
        (handler: (context: { data: unknown }) => Promise<unknown>) =>
        async (options?: { data?: unknown }) =>
          handler({ data: validate(options?.data) }),
    }
    return chain
  },
}))

const { fetchCurrentUserRoles, serverRequireAuth } = await import('./auth')
beforeEach(() => vi.resetAllMocks())

function profile(fetch: typeof globalThis.fetch) {
  vi.mocked(getSession).mockResolvedValue(createMockSession())
  vi.mocked(createRequestSdk).mockResolvedValue(
    createWallowSdk({ baseUrl: 'https://fixture.example', fetch }),
  )
}

describe('Current user capabilities', () => {
  it('returns the authenticated profile roles and permissions', async () => {
    profile(() =>
      Promise.resolve(
        Response.json({
          id: 'test-user-123',
          roles: ['admin', 'user'],
          permissions: ['InquiriesRead'],
        }),
      ),
    )
    expect(await fetchCurrentUserRoles()).toEqual({
      roles: ['admin', 'user'],
      permissions: ['InquiriesRead'],
    })
  })
  it('returns empty roles and permissions when signed out', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    expect(await fetchCurrentUserRoles()).toEqual({
      roles: [],
      permissions: [],
    })
  })
})

describe('Server authorization', () => {
  it.each([
    [{ returnTo: '/dashboard' }, '/bff/login?returnTo=%2Fdashboard'],
    [{}, '/bff/login'],
    [{ returnTo: undefined }, '/bff/login'],
    [
      { returnTo: '/dashboard?tab=inquiries#details' },
      '/bff/login?returnTo=%2Fdashboard%3Ftab%3Dinquiries%23details',
    ],
    [{ returnTo: '' }, '/bff/login'],
    [
      { returnTo: 'https://example.com/path' },
      '/bff/login?returnTo=https%3A%2F%2Fexample.com%2Fpath',
    ],
  ])('preserves the login redirect for %j', async (data, href) => {
    vi.mocked(getSession).mockResolvedValue(null)
    await expect(serverRequireAuth({ data })).rejects.toMatchObject({
      options: { href },
    })
  })
  it.each([
    null,
    [],
    'dashboard',
    42,
    { returnTo: 42 },
    { returnTo: false },
    { returnTo: [] },
    { returnTo: null },
    { returnTo: {} },
  ])('rejects malformed input %j before checking the session', async (data) => {
    await expect(
      Reflect.apply(serverRequireAuth, undefined, [{ data }]),
    ).rejects.toBeInstanceOf(ZodError)
    expect(getSession).not.toHaveBeenCalled()
    expect(createRequestSdk).not.toHaveBeenCalled()
  })
  it('waits for authorization before completing an allowed request', async () => {
    let resolveResponse: (response: Response) => void = () => {
      throw new Error('Response fixture is not initialized')
    }
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve
    })
    const fetch = vi.fn(() => response)
    profile(fetch)
    let completed = false
    const request = serverRequireAuth({ data: {} }).then(() => {
      completed = true
    })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(completed).toBe(false)
    resolveResponse(Response.json({ id: 'test-user-123' }))
    await request
    expect(completed).toBe(true)
  })
  it('propagates an authorization service failure', async () => {
    profile(() =>
      Promise.resolve(
        Response.json({ message: 'Unavailable' }, { status: 503 }),
      ),
    )
    await expect(serverRequireAuth({ data: {} })).rejects.toMatchObject({
      status: 503,
    })
  })
})
