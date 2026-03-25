import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {  createElement } from 'react'
import type {ReactNode} from 'react';
import { createMockUser } from '@/test/mocks/auth'
import { renderWithProviders } from '@/test/helpers/render'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useUser', () => {
  it('returns null user when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    const { useUser } = await import('./useUser')
    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
  })

  it('returns populated user on success', async () => {
    const mockUser = createMockUser({ name: 'Bryan Cordes' })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    })

    const { useUser } = await import('./useUser')
    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.user?.name).toBe('Bryan Cordes')
  })

  it('calls /auth/me endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    const { useUser } = await import('./useUser')
    renderHook(() => useUser(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/auth/me')
    })
  })
})

describe('useRequireUser', () => {
  it('returns isAuthenticated true when user exists', async () => {
    const mockUser = createMockUser()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    })

    const { useRequireUser } = await import('./useUser')
    const { result } = renderHook(() => useRequireUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
  })

  it('returns isAuthenticated false when user is null', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    const { useRequireUser } = await import('./useUser')
    const { result } = renderHook(() => useRequireUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
