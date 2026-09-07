import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  QueryClient,
  hydrate,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Provider, getContext } from './root-provider'

const SSR_KEY = ['root-provider-ssr-probe']

/** Fixture for a populated dehydrated query cache. */
function dehydratedServerState(data: string) {
  return {
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
  }
}

describe('root-provider', () => {
  afterEach(() => {
    cleanup()
  })

  describe('getContext', () => {
    it('returns an object with a QueryClient instance', () => {
      const ctx = getContext()
      expect(ctx).toHaveProperty('queryClient')
      expect(ctx.queryClient).toBeInstanceOf(QueryClient)
    })

    it('returns a new QueryClient on each call', () => {
      const ctx1 = getContext()
      const ctx2 = getContext()
      expect(ctx1.queryClient).not.toBe(ctx2.queryClient)
    })
  })

  describe('Provider', () => {
    it('renders children', () => {
      const queryClient = new QueryClient()
      render(
        <Provider queryClient={queryClient}>
          <div data-testid="child">Hello</div>
        </Provider>,
      )
      expect(screen.getByTestId('child')).toBeTruthy()
      expect(screen.getByText('Hello')).toBeTruthy()
    })

    it('makes QueryClient accessible to children via useQueryClient', () => {
      const queryClient = new QueryClient()
      let clientFromHook: QueryClient | undefined

      function TestConsumer() {
        clientFromHook = useQueryClient()
        return <span>consumer</span>
      }

      render(
        <Provider queryClient={queryClient}>
          <TestConsumer />
        </Provider>,
      )

      expect(clientFromHook).toBe(queryClient)
    })

    it('renders multiple children', () => {
      const queryClient = new QueryClient()
      render(
        <Provider queryClient={queryClient}>
          <span>First</span>
          <span>Second</span>
        </Provider>,
      )
      expect(screen.getByText('First')).toBeTruthy()
      expect(screen.getByText('Second')).toBeTruthy()
    })

    it('cleans up on unmount without errors', () => {
      const queryClient = new QueryClient()
      const { unmount } = render(
        <Provider queryClient={queryClient}>
          <div>content</div>
        </Provider>,
      )
      expect(() => unmount()).not.toThrow()
    })

    it('uses the provided queryClient, not a default one', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 99999 },
        },
      })
      let capturedClient: QueryClient | undefined

      function Inspector() {
        capturedClient = useQueryClient()
        return null
      }

      render(
        <Provider queryClient={queryClient}>
          <Inspector />
        </Provider>,
      )

      expect(capturedClient).toBe(queryClient)
      expect(capturedClient?.getDefaultOptions().queries?.staleTime).toBe(99999)
    })

    it('serves server-hydrated query data to children without refetching', async () => {
      const queryClient = new QueryClient()
      hydrate(queryClient, dehydratedServerState('from-server'))

      const queryFn = vi.fn(
        (): Promise<string> =>
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

      render(
        <Provider queryClient={queryClient}>
          <Consumer />
        </Provider>,
      )

      expect(await screen.findByTestId('value')).toHaveTextContent(
        'from-server',
      )
      expect(queryFn).not.toHaveBeenCalled()
    })
  })
})
