import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import {
  firstInquiryId,
  resetBackend,
} from '../../../testing/dashboard-backend'
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

it('renders both list and detail content inside the real inquiries parent', async () => {
  const { router } = await renderDashboard('/dashboard/inquiries')
  expect(screen.getByRole('heading', { name: 'Messages' })).toBeVisible()
  fireEvent.click(screen.getByRole('cell', { name: 'Alice' }))
  expect(
    await screen.findByRole('heading', { name: 'Inquiry Details' }),
  ).toBeVisible()
  expect(screen.getByText('A new website')).toBeVisible()
  expect(router.state.location.pathname).toBe(
    `/dashboard/inquiries/${firstInquiryId}`,
  )
})
