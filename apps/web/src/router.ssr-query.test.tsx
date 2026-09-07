import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, useQuery } from '@tanstack/react-query'
import * as Query from '@bcordes/query'

// Verify the router and its rendered children share the hydrated query client.

vi.mock('@bcordes/query', async (importOriginal) => {
  const actual = await importOriginal<typeof Query>()
  return { ...actual, getContext: vi.fn(actual.getContext) }
})

vi.mock('./routeTree.gen', async () => {
  const { createRootRoute } = await import('@tanstack/react-router')
  return { routeTree: createRootRoute() }
})

const SSR_KEY = ['router-ssr-probe']

/** A dehydrated query cache with no pending streamed queries. */
function dehydratedRouterPayload(data: string) {
  return {
    dehydratedQueryClient: {
      mutations: [],
      queries: [
        {
          queryKey: SSR_KEY,
          queryHash: JSON.stringify(SSR_KEY),
          state: {
            data,
            dataUpdateCount: 1,
            dataUpdatedAt: Date.now(),
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            isInvalidated: false,
            status: 'success' as const,
            fetchStatus: 'idle' as const,
          },
        },
      ],
    },
    queryStream: new ReadableStream({
      start(controller) {
        controller.close()
      },
    }),
  }
}

describe('router SSR query integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sources the router query client from @bcordes/query', async () => {
    const { getRouter } = await import('./router')
    const router = getRouter()

    expect(Query.getContext).toHaveBeenCalledOnce()
    expect(router.options.context.queryClient).toBeInstanceOf(QueryClient)
  })

  it('installs the SSR hydration hook on the router', async () => {
    const { getRouter } = await import('./router')
    const router = getRouter()

    expect(Query.getContext).toHaveBeenCalledOnce()
    expect(typeof router.options.hydrate).toBe('function')
  })

  it('hydrates server-dehydrated state into the query client the package created', async () => {
    const { getRouter } = await import('./router')
    const router = getRouter()
    const queryClient = router.options.context.queryClient

    await router.options.hydrate?.(dehydratedRouterPayload('from-server'))

    expect(Query.getContext).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(SSR_KEY)).toBe('from-server')
  })

  it("serves the hydrated data to components under the router's Wrap without refetching", async () => {
    const { getRouter } = await import('./router')
    const router = getRouter()

    await router.options.hydrate?.(dehydratedRouterPayload('from-server'))

    const queryFn = vi.fn((): Promise<string> =>
      Promise.reject(new Error('must not refetch hydrated data')),
    )

    function Consumer() {
      const { data } = useQuery({
        queryKey: SSR_KEY,
        queryFn,
        staleTime: Infinity,
      })
      return <span data-testid="value">{data ?? 'no-data'}</span>
    }

    const Wrap = router.options.Wrap
    if (!Wrap) {
      throw new Error('the SSR query integration installed no Wrap component')
    }

    render(
      <Wrap>
        <Consumer />
      </Wrap>,
    )

    expect(Query.getContext).toHaveBeenCalledOnce()
    expect(await screen.findByTestId('value')).toHaveTextContent('from-server')
    expect(queryFn).not.toHaveBeenCalled()
  })
})
