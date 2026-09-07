import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, dehydrate, useQuery } from '@tanstack/react-query'

// Verify the router and its rendered children share the hydrated query client.

vi.mock('./routeTree.gen', async () => {
  const { createRootRoute } = await import('@tanstack/react-router')
  return { routeTree: createRootRoute() }
})

const SSR_KEY = ['router-ssr-probe']

/** A dehydrated query cache with no pending streamed queries. */
function dehydratedRouterPayload(data: string) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(SSR_KEY, data)
  return {
    query: {
      initial: dehydrate(queryClient).queries,
      stream: new ReadableStream({
        start(controller) {
          controller.close()
        },
      }),
    },
  }
}

describe('router SSR query integration', () => {
  it('hydrates server data into the router cache', async () => {
    const { getRouter } = await import('./router')
    const router = getRouter()
    const queryClient = router.options.context.queryClient

    await router.options.hydrate?.(dehydratedRouterPayload('from-server'))

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

    expect(await screen.findByTestId('value')).toHaveTextContent('from-server')
    expect(queryFn).not.toHaveBeenCalled()
  })
})
