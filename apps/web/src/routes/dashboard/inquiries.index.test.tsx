import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import {
  backend,
  firstInquiryId,
  makeInquiry,
  pauseRequest,
  resetBackend,
  secondInquiryId,
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

it.each([
  { roles: ['user'], permissions: ['InquiriesRead'], editable: true },
  { roles: ['admin'], permissions: ['InquiriesWrite'], editable: false },
])(
  'uses InquiriesRead permission for editing with roles $roles',
  async ({ roles, permissions, editable }) => {
    Object.assign(backend.user, { roles, permissions })
    await renderDashboard()
    expect(screen.queryByRole('combobox') !== null).toBe(editable)
    expect(screen.getByRole('heading', { name: 'Messages' })).toBeVisible()
  },
)

it.each([
  {
    permissions: ['InquiriesRead'],
    explanation: 'Contact form submissions will appear here.',
  },
  {
    permissions: ['InquiriesWrite'],
    explanation: 'Inquiries you submit will appear here.',
  },
])(
  'explains the empty list for $permissions',
  async ({ permissions, explanation }) => {
    backend.user.permissions = permissions
    backend.inquiries = []
    await renderDashboard()
    expect(
      screen.getByRole('heading', { name: 'No messages yet' }),
    ).toBeVisible()
    expect(screen.getByText(explanation)).toBeVisible()
  },
)

it('associates each customer with their email, company, project and budget', async () => {
  backend.inquiries = [
    makeInquiry(),
    makeInquiry({
      id: secondInquiryId,
      name: 'Bob',
      email: 'bob@example.com',
      company: 'BobCorp',
      projectType: 'consulting',
      budgetRange: '$50k+',
    }),
  ]
  await renderDashboard()
  const rows = screen.getAllByRole('row').slice(1)
  expect(rows).toHaveLength(2)
  expect(
    within(rows[0])
      .getAllByRole('cell')
      .slice(0, 5)
      .map((cell) => cell.textContent),
  ).toEqual([
    'Alice',
    'alice@example.com',
    'Acme',
    'Full-Stack Development',
    '$5k-$15k',
  ])
  expect(
    within(rows[1])
      .getAllByRole('cell')
      .slice(0, 5)
      .map((cell) => cell.textContent),
  ).toEqual(['Bob', 'bob@example.com', 'BobCorp', 'Consulting', '$50k+'])
  expect(screen.getByText('Showing 2 messages')).toBeVisible()
})

it('shows placeholders in each missing optional column while preserving a populated row', async () => {
  backend.inquiries = [
    makeInquiry({
      company: undefined,
      projectType: undefined,
      budgetRange: undefined,
    }),
    makeInquiry({ id: secondInquiryId, name: 'Bob' }),
  ]
  await renderDashboard()
  const rows = screen.getAllByRole('row').slice(1)
  expect(
    within(rows[0])
      .getAllByRole('cell')
      .slice(2, 5)
      .map((cell) => cell.textContent),
  ).toEqual(['-', '-', '-'])
  expect(
    within(rows[1])
      .getAllByRole('cell')
      .slice(2, 5)
      .map((cell) => cell.textContent),
  ).toEqual(['Acme', 'Full-Stack Development', '$5k-$15k'])
})

it.each(['New', 'Reviewed', 'Contacted', 'Closed'])(
  'shows the read-only %s status to customers',
  async (status) => {
    backend.inquiries = [makeInquiry({ status })]
    await renderDashboard()
    const row = screen.getAllByRole('row')[1]
    expect(within(row).getAllByRole('cell')[6]).toHaveTextContent(status)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  },
)

it('counts only new inquiries in the header', async () => {
  backend.inquiries = [
    makeInquiry(),
    makeInquiry({ id: secondInquiryId }),
    makeInquiry({
      id: '550e8400-e29b-41d4-a716-446655440002',
      status: 'Reviewed',
    }),
  ]
  await renderDashboard()
  expect(screen.getByText('2 new')).toBeVisible()
})

it('uses singular message for one result', async () => {
  await renderDashboard()
  expect(screen.getByText('Showing 1 message')).toBeVisible()
})

it('preserves an unknown project type and humanizes an unknown status', async () => {
  backend.inquiries = [
    makeInquiry({ projectType: 'custom_unknown_type', status: 'in_progress' }),
  ]
  await renderDashboard()
  expect(screen.getByText('custom_unknown_type')).toBeVisible()
  expect(screen.getByText('in progress')).toBeVisible()
})

it.each([firstInquiryId, secondInquiryId])(
  'opens the selected inquiry %s through the nested detail route',
  async (id) => {
    backend.inquiries = [
      makeInquiry(),
      makeInquiry({
        id: secondInquiryId,
        name: 'Bob',
        message: 'A reporting tool',
      }),
    ]
    const selected = backend.inquiries.find((inquiry) => inquiry.id === id)!
    const other = backend.inquiries.find((inquiry) => inquiry.id !== id)!
    const { router } = await renderDashboard()
    fireEvent.click(screen.getByText(selected.name))
    expect(
      await screen.findByRole('heading', { name: 'Inquiry Details' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(`/dashboard/inquiries/${id}`)
    expect(screen.getByText(selected.message)).toBeVisible()
    expect(screen.queryByText(other.message)).not.toBeInTheDocument()
  },
)

it.each(['New', 'Reviewed', 'Contacted', 'Closed'])(
  'persists %s and reloads the row without opening detail',
  async (status) => {
    backend.user.permissions = ['InquiriesRead']
    backend.inquiries = [
      makeInquiry({ status: status === 'New' ? 'Closed' : 'New' }),
    ]
    const { router } = await renderDashboard()
    const pending = pauseRequest(
      'PATCH',
      `/v1/inquiries/${firstInquiryId}/status`,
    )
    fireEvent.click(screen.getByRole('combobox'))
    expect(
      (await screen.findAllByRole('option')).map(
        (option) => option.textContent,
      ),
    ).toEqual(['New', 'Reviewed', 'Contacted', 'Closed'])
    fireEvent.click(screen.getByRole('option', { name: status }))
    await waitFor(() =>
      expect(
        backend.requests.filter((request) => request.method === 'PATCH'),
      ).toHaveLength(1),
    )
    const write = backend.requests.find(
      (request) => request.method === 'PATCH',
    )!
    expect(await write.json()).toEqual({ newStatus: status })
    expect(backend.inquiries[0].status).not.toBe(status)
    await act(() => pending.resolve(undefined))
    await waitFor(() =>
      expect(screen.getByRole('combobox')).toHaveTextContent(
        status.toLowerCase(),
      ),
    )
    expect(backend.inquiries[0].status).toBe(status)
    expect(router.state.location.pathname).toBe('/dashboard/inquiries')
  },
)

it('disables refresh until new records arrive, then permits another refresh', async () => {
  await renderDashboard()
  const pending = pauseRequest('GET', '/v1/inquiries/submitted')
  const button = screen.getByRole('button', { name: 'Refresh' })
  fireEvent.click(button)
  expect(button).toBeDisabled()
  backend.inquiries = [makeInquiry({ name: 'Updated Alice' })]
  await act(() => pending.resolve(undefined))
  expect(await screen.findByText('Updated Alice')).toBeVisible()
  expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  await waitFor(() => expect(button).toBeEnabled())
  fireEvent.click(button)
  await waitFor(() => expect(button).toBeEnabled())
})

it('shows a failed status update, keeps the persisted status, and permits retry', async () => {
  backend.user.permissions = ['InquiriesRead']
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await renderDashboard()
  const pending = pauseRequest(
    'PATCH',
    `/v1/inquiries/${firstInquiryId}/status`,
  )
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.click(await screen.findByRole('option', { name: 'Closed' }))
  await act(() =>
    pending.resolve(
      Response.json(
        {
          type: 'about:blank',
          title: 'Try again',
          status: 409,
          code: 'status_conflict',
          detail: 'Status service unavailable',
        },
        { status: 409 },
      ),
    ),
  )
  expect(await screen.findByText('Failed to update status')).toBeVisible()
  expect(screen.getByText('Status service unavailable')).toBeVisible()
  expect(screen.getByRole('combobox')).toHaveTextContent('new')
  backend.intercept = undefined
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.click(await screen.findByRole('option', { name: 'Closed' }))
  await waitFor(() =>
    expect(screen.getByRole('combobox')).toHaveTextContent('closed'),
  )
  expect(backend.inquiries[0].status).toBe('Closed')
})

it('redirects signed-out visitors to sign in with the inquiry return destination before loading inquiries', async () => {
  backend.signedIn = false
  const { router } = await renderDashboard()
  expect(router.state.location.href).toBe(
    '/bff/login?returnTo=%2Fdashboard%2Finquiries',
  )
  expect(backend.requests).toHaveLength(0)
  expect(
    screen.queryByRole('heading', { name: 'Messages' }),
  ).not.toBeInTheDocument()
})

it('surfaces a failed refresh through the router and permits a successful reload', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { router } = await renderDashboard()
  const pending = pauseRequest('GET', '/v1/inquiries/submitted')
  const button = screen.getByRole('button', { name: 'Refresh' })
  fireEvent.click(button)
  expect(button).toBeDisabled()
  await act(() =>
    pending.resolve(
      Response.json(
        { status: 503, title: 'Unavailable', code: 'unavailable' },
        { status: 503 },
      ),
    ),
  )
  expect(await screen.findByText('Something went wrong!')).toBeVisible()
  backend.intercept = undefined
  backend.inquiries = [makeInquiry({ name: 'Recovered Alice' })]
  await act(async () => {
    await router.invalidate()
  })
  expect(await screen.findByText('Recovered Alice')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled(),
  )
})
