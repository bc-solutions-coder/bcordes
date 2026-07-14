import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { Provider, getContext } from './root-provider'

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
  })
})
