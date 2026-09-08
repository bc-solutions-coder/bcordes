import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { resetBackend } from '../../../testing/dashboard-backend'
import { renderDashboard } from '../../../testing/render-dashboard'

vi.mock(
  '@tanstack/react-start',
  () => import('../../../testing/server-functions'),
)
vi.mock(
  '@bcordes/auth/session',
  () => import('../../../testing/dashboard-backend'),
)
vi.mock('@bcordes/auth/sdk', () => import('../../../testing/dashboard-backend'))
vi.mock(
  '@bcordes/wallow/client',
  () => import('../../../testing/dashboard-backend'),
)

beforeEach(() => {
  resetBackend()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.stubGlobal('BroadcastChannel', undefined)
  vi.stubGlobal(
    'EventSource',
    class extends EventTarget {
      close() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('renders the settings index and loaded controls inside the real settings parent', async () => {
  const { router } = await renderDashboard('/dashboard/settings')
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
  expect(screen.getByText('Receive notifications via email')).toBeVisible()
  expect(screen.getAllByRole('switch')).toHaveLength(4)
  expect(router.state.location.pathname).toBe('/dashboard/settings')
})
