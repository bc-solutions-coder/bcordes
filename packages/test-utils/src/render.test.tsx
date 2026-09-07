import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from '@bcordes/test-utils'

it('renders asynchronous query data and interactive updates through the public helpers', async () => {
  function Consumer() {
    const [count, setCount] = useState(0)
    const { data } = useQuery({
      queryKey: ['public-helper'],
      queryFn: () => Promise.resolve('Loaded'),
    })
    return (
      <button onClick={() => setCount(count + 1)}>
        {data ?? 'Loading'} {count}
      </button>
    )
  }
  renderWithProviders(<Consumer />)
  const button = await screen.findByRole('button', { name: 'Loaded 0' })
  fireEvent.click(button)
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Loaded 1' })).toBeVisible(),
  )
})

it('does not retry a rejected query', async () => {
  const queryFn = vi.fn(() => Promise.reject(new Error('Unavailable')))
  function Consumer() {
    const { error } = useQuery({ queryKey: ['failed-helper'], queryFn })
    return <p>{error?.message ?? 'Loading'}</p>
  }
  renderWithProviders(<Consumer />)
  expect(await screen.findByText('Unavailable')).toBeVisible()
  expect(queryFn).toHaveBeenCalledTimes(1)
})

it('does not share cached query data between separate renders', async () => {
  function Consumer({ value }: { value: string }) {
    const { data } = useQuery({
      queryKey: ['isolated-helper'],
      queryFn: () => Promise.resolve(value),
      staleTime: Infinity,
    })
    return <p>{data}</p>
  }
  const first = renderWithProviders(<Consumer value="First render" />)
  expect(await first.findByText('First render')).toBeVisible()
  const second = renderWithProviders(<Consumer value="Second render" />)
  expect(await second.findByText('Second render')).toBeVisible()
  expect(screen.getByText('First render')).toBeVisible()
})

it('applies the caller container and base element options', () => {
  const baseElement = document.createElement('section')
  const container = document.createElement('article')
  baseElement.append(container)
  document.body.append(baseElement)
  const rendered = renderWithProviders(<button>Caller container</button>, {
    container,
    baseElement,
  })
  try {
    expect(container.querySelector('button')).toHaveTextContent(
      'Caller container',
    )
    expect(
      rendered.getByRole('button', { name: 'Caller container' }),
    ).toBeVisible()
  } finally {
    rendered.unmount()
    baseElement.remove()
  }
})
