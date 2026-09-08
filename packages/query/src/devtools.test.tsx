import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Provider, getContext } from './index'
import type pluginDefinition from './devtools'

let devtoolsPlugin: typeof pluginDefinition
beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({
      media,
      matches: false,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  )
  devtoolsPlugin = (await import('./devtools')).default
})
afterAll(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it(
  'labels the query inspector in the developer tools',
  { timeout: 15_000 },
  async () => {
    const { queryClient } = getContext()
    render(
      <Provider queryClient={queryClient}>
        <TanStackDevtools
          plugins={[devtoolsPlugin]}
          config={{ defaultOpen: true }}
        />
      </Provider>,
    )
    expect(
      await screen.findByText(
        'Tanstack Query',
        { exact: true },
        { timeout: 10_000 },
      ),
    ).toBeVisible()
  },
)

it(
  'shows cached queries and their data in the query inspector',
  { timeout: 15_000 },
  async () => {
    const { queryClient } = getContext()
    queryClient.setQueryData(['inspector-fixture'], {
      message: 'Cached inspection value',
    })
    render(
      <Provider queryClient={queryClient}>
        <TanStackDevtools
          plugins={[devtoolsPlugin]}
          config={{ defaultOpen: true }}
        />
      </Provider>,
    )
    expect(
      await screen.findByText(
        'Tanstack Query',
        { exact: true },
        { timeout: 10_000 },
      ),
    ).toBeVisible()
    fireEvent.click(
      await screen.findByText(
        '["inspector-fixture"]',
        { exact: true },
        { timeout: 10_000 },
      ),
    )
    expect(
      await screen.findByRole(
        'textbox',
        { name: 'message:' },
        { timeout: 10_000 },
      ),
    ).toHaveValue('Cached inspection value')
  },
)
