import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { resetBackend } from '../../../testing/dashboard-backend'
import { DashboardEventSource } from '../../../testing/dashboard-browser'
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
  vi.stubGlobal('EventSource', DashboardEventSource)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
it('renders the real notification index inside its parent route', async () => {
  const { router } = await renderDashboard('/dashboard/notifications')
  expect(screen.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  expect(screen.getByText('Website inquiry')).toBeVisible()
  expect(router.state.location.pathname).toBe('/dashboard/notifications')
})
