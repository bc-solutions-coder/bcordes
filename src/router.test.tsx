import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const mockCreateRouter = vi.fn()
const mockSetupRouterSsrQueryIntegration = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createRouter: mockCreateRouter,
}))

vi.mock('@tanstack/react-router-ssr-query', () => ({
  setupRouterSsrQueryIntegration: mockSetupRouterSsrQueryIntegration,
}))

const mockQueryClient = { defaultOptions: {} }
const mockGetContext = vi.fn(() => ({ queryClient: mockQueryClient }))
const mockProvider = vi.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
))

vi.mock('./integrations/tanstack-query/root-provider', () => ({
  getContext: mockGetContext,
  Provider: mockProvider,
}))

vi.mock('./routeTree.gen', () => ({
  routeTree: { __isRouteTree: true },
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateRouter.mockReturnValue({ __isRouter: true })
  })

  it('creates a router with the route tree and context from TanStack Query', async () => {
    const { getRouter } = await import('./router')
    getRouter()

    expect(mockGetContext).toHaveBeenCalledOnce()
    expect(mockCreateRouter).toHaveBeenCalledOnce()

    const config = mockCreateRouter.mock.calls[0][0]
    expect(config.routeTree).toEqual({ __isRouteTree: true })
    expect(config.context).toEqual({ queryClient: mockQueryClient })
  })

  it('sets defaultPreload to intent', async () => {
    const { getRouter } = await import('./router')
    getRouter()

    const config = mockCreateRouter.mock.calls[0][0]
    expect(config.defaultPreload).toBe('intent')
  })

  it('provides a Wrap component that renders TanstackQuery.Provider', async () => {
    const { getRouter } = await import('./router')
    getRouter()

    const config = mockCreateRouter.mock.calls[0][0]
    expect(config.Wrap).toBeDefined()
    expect(typeof config.Wrap).toBe('function')
  })

  it('sets up SSR query integration with the router and queryClient', async () => {
    const { getRouter } = await import('./router')
    getRouter()

    expect(mockSetupRouterSsrQueryIntegration).toHaveBeenCalledOnce()
    expect(mockSetupRouterSsrQueryIntegration).toHaveBeenCalledWith({
      router: { __isRouter: true },
      queryClient: mockQueryClient,
    })
  })

  it('returns the created router instance', async () => {
    const { getRouter } = await import('./router')
    const router = getRouter()

    expect(router).toEqual({ __isRouter: true })
  })

  it('creates a fresh context on each invocation', async () => {
    const { getRouter } = await import('./router')

    getRouter()
    getRouter()

    expect(mockGetContext).toHaveBeenCalledTimes(2)
    expect(mockCreateRouter).toHaveBeenCalledTimes(2)
  })

  it('Wrap component renders TanstackQuery.Provider with children', async () => {
    const { getRouter } = await import('./router')
    getRouter()

    const config = mockCreateRouter.mock.calls[0][0]
    const Wrap = config.Wrap as React.FC<{ children: React.ReactNode }>

    render(
      <Wrap>
        <span data-testid="child">hello</span>
      </Wrap>,
    )

    expect(screen.getByTestId('child')).toHaveTextContent('hello')
    expect(mockProvider).toHaveBeenCalled()
    expect(mockProvider.mock.calls[0][0]).toMatchObject({
      queryClient: mockQueryClient,
    })
  })

  it('spreads the rqContext into the router context', async () => {
    const extendedContext = {
      queryClient: mockQueryClient,
      extraProp: 'test-value',
    }
    mockGetContext.mockReturnValueOnce(extendedContext)

    const { getRouter } = await import('./router')
    getRouter()

    const config = mockCreateRouter.mock.calls[0][0]
    expect(config.context).toEqual(extendedContext)
  })
})
