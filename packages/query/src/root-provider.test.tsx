import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import {
  QueryClient,
  dehydrate,
  hydrate,
  useQuery,
} from '@tanstack/react-query'
import { Provider, getContext } from './index'

const key = ['provider-value']

describe('Query provider', () => {
  it('keeps query data isolated between contexts', () => {
    const first = getContext()
    const second = getContext()
    first.queryClient.setQueryData(key, 'first')
    expect(second.queryClient.getQueryData(key)).toBeUndefined()
    second.queryClient.setQueryData(key, 'second')
    expect(first.queryClient.getQueryData(key)).toBe('first')
    expect(second.queryClient.getQueryData(key)).toBe('second')
  })

  it('renders children', () => {
    render(
      <Provider queryClient={new QueryClient()}>
        <p>Hello</p>
      </Provider>,
    )
    expect(screen.getByText('Hello')).toBeVisible()
  })

  it('renders data and subsequent updates from the supplied query cache', async () => {
    const { queryClient } = getContext()
    queryClient.setQueryData(key, 'cached value')
    function Consumer() {
      const { data } = useQuery({
        queryKey: key,
        queryFn: () => Promise.resolve('remote value'),
        staleTime: Infinity,
      })
      return <p>{data}</p>
    }
    render(
      <Provider queryClient={queryClient}>
        <Consumer />
      </Provider>,
    )
    expect(await screen.findByText('cached value')).toBeVisible()
    act(() => {
      queryClient.setQueryData(key, 'updated value')
    })
    expect(await screen.findByText('updated value')).toBeVisible()
  })

  it('renders multiple children', () => {
    render(
      <Provider queryClient={new QueryClient()}>
        <span>First</span>
        <span>Second</span>
      </Provider>,
    )
    expect(screen.getByText('First')).toBeVisible()
    expect(screen.getByText('Second')).toBeVisible()
  })

  it('uses caller freshness settings to avoid refetching cached data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    })
    queryClient.setQueryData(key, 'fresh cached value')
    const fetchValue = vi.fn(() => Promise.resolve('unexpected fetch'))
    function Consumer() {
      const { data } = useQuery({ queryKey: key, queryFn: fetchValue })
      return <p>{data}</p>
    }
    render(
      <Provider queryClient={queryClient}>
        <Consumer />
      </Provider>,
    )
    expect(await screen.findByText('fresh cached value')).toBeVisible()
    expect(fetchValue).not.toHaveBeenCalled()
  })

  it('serves server-hydrated query data to children without refetching', async () => {
    const server = getContext()
    server.queryClient.setQueryData(key, 'from-server')
    const client = getContext()
    hydrate(client.queryClient, dehydrate(server.queryClient))
    const queryFn = vi.fn((): Promise<string> =>
      Promise.reject(new Error('must not refetch hydrated data')),
    )
    function Consumer() {
      const { data } = useQuery({ queryKey: key, queryFn, staleTime: Infinity })
      return <p>{data ?? 'no-data'}</p>
    }
    render(
      <Provider queryClient={client.queryClient}>
        <Consumer />
      </Provider>,
    )
    expect(await screen.findByText('from-server')).toBeVisible()
    expect(queryFn).not.toHaveBeenCalled()
  })
})
