import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
import { invalidateNotifications } from './query-utils'

it('refreshes the active notification list and unread count without changing unrelated cached data', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  let titles = ['Original message']
  let unread = 3
  const list = new QueryObserver(client, {
    queryKey: ['notifications'],
    queryFn: () => Promise.resolve(titles),
  })
  const count = new QueryObserver(client, {
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => Promise.resolve(unread),
  })
  const stopList = list.subscribe(() => {})
  const stopCount = count.subscribe(() => {})
  client.setQueryData(['profile'], { name: 'Alice' })
  try {
    await waitFor(() =>
      expect(list.getCurrentResult().data).toEqual(['Original message']),
    )
    await waitFor(() => expect(count.getCurrentResult().data).toBe(3))
    titles = ['Updated message', 'Another message']
    unread = 7
    invalidateNotifications(client)
    await waitFor(() =>
      expect(list.getCurrentResult().data).toEqual([
        'Updated message',
        'Another message',
      ]),
    )
    await waitFor(() => expect(count.getCurrentResult().data).toBe(7))
    expect(client.getQueryData(['profile'])).toEqual({ name: 'Alice' })
  } finally {
    stopList()
    stopCount()
    client.clear()
  }
})
