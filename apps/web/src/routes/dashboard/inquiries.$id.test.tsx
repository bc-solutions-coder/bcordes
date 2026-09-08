import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  backend,
  firstInquiryId,
  makeComment,
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

const path = `/dashboard/inquiries/${firstInquiryId}`
const internalLabel = 'Internal note (not visible to submitter)'
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

it.each([firstInquiryId, secondInquiryId])(
  'loads the inquiry and comments selected by UUID %s',
  async (id) => {
    backend.inquiries = [
      makeInquiry(),
      makeInquiry({
        id: secondInquiryId,
        name: 'Bob',
        message: 'A reporting tool',
      }),
    ]
    backend.comments = [
      makeComment(),
      makeComment({
        id: secondInquiryId,
        inquiryId: secondInquiryId,
        content: 'Reporting clarification',
      }),
    ]
    const selected = backend.inquiries.find((inquiry) => inquiry.id === id)!
    const other = backend.inquiries.find((inquiry) => inquiry.id !== id)!
    await renderDashboard(`/dashboard/inquiries/${id}`)
    expect(screen.getByText(selected.name)).toBeVisible()
    expect(screen.getByText(selected.message)).toBeVisible()
    expect(screen.queryByText(other.name)).not.toBeInTheDocument()
    expect(screen.queryByText(other.message)).not.toBeInTheDocument()
    for (const comment of backend.comments) {
      expect(screen.queryByText(comment.content) !== null).toBe(
        comment.inquiryId === id,
      )
    }
  },
)

it('shows contact and project values under their labels, submission time and message', async () => {
  await renderDashboard(path)
  expect(screen.getByRole('heading', { name: 'Inquiry Details' })).toBeVisible()
  for (const [label, value] of [
    ['Name', 'Alice'],
    ['Email', 'alice@example.com'],
    ['Company', 'Acme'],
    ['Project Type', 'fullstack'],
    ['Budget', '$5k-$15k'],
    ['Timeline', '1-3 months'],
    ['Submitted', 'Jan 15, 2026'],
  ]) {
    const term = screen.getByText(label, { selector: 'dt' })
    expect(term.nextElementSibling).toHaveTextContent(value)
  }
  expect(
    screen.getByRole('heading', { name: 'Message' }).parentElement,
  ).toHaveTextContent('A new website')
})

it('omits absent optional detail fields', async () => {
  backend.inquiries = [
    makeInquiry({
      company: undefined,
      projectType: undefined,
      budgetRange: undefined,
      timeline: undefined,
    }),
  ]
  await renderDashboard(path)
  for (const name of ['Company', 'Project Type', 'Budget', 'Timeline']) {
    expect(screen.queryByText(name, { selector: 'dt' })).not.toBeInTheDocument()
  }
  expect(screen.getByText('Alice')).toBeVisible()
})

it('returns to the inquiry list through the Back to inquiries link', async () => {
  const { router } = await renderDashboard(path)
  const link = screen.getByRole('link', { name: 'Back to inquiries' })
  expect(link).toHaveAttribute('href', '/dashboard/inquiries')
  fireEvent.click(link)
  expect(await screen.findByRole('heading', { name: 'Messages' })).toBeVisible()
  expect(router.state.location.pathname).toBe('/dashboard/inquiries')
  expect(screen.getByRole('cell', { name: 'Alice' })).toBeVisible()
})

it('shows in_progress status as in progress', async () => {
  backend.inquiries = [makeInquiry({ status: 'in_progress' })]
  await renderDashboard(path)
  expect(screen.getByText('in progress')).toBeVisible()
})

it.each([
  { roles: ['user'], permissions: ['InquiriesRead'], staff: true },
  { roles: ['admin'], permissions: ['InquiriesWrite'], staff: false },
])(
  'uses permission rather than roles $roles for internal notes',
  async ({ roles, permissions, staff }) => {
    Object.assign(backend.user, { roles, permissions })
    backend.comments = [
      makeComment(),
      makeComment({
        id: secondInquiryId,
        content: 'Private assessment',
        isInternal: true,
        authorName: 'Private author',
      }),
    ]
    await renderDashboard(path)
    expect(screen.getByText('We can help')).toBeVisible()
    expect(screen.getByText('Support')).toBeVisible()
    expect(screen.queryByText('Private assessment') !== null).toBe(staff)
    expect(screen.queryByText('Private author') !== null).toBe(staff)
    expect(screen.queryByText('Internal', { exact: true }) !== null).toBe(staff)
    expect(
      screen.queryByRole('checkbox', { name: internalLabel }) !== null,
    ).toBe(staff)
  },
)

it.each([false, true])(
  'shows no comments when customers have no public comments (internal only: %s)',
  async (internalOnly) => {
    backend.comments = internalOnly
      ? [makeComment({ content: 'Private assessment', isInternal: true })]
      : []
    await renderDashboard(path)
    expect(screen.getByText('No comments yet.')).toBeVisible()
    expect(screen.queryByText('Private assessment')).not.toBeInTheDocument()
  },
)

it.each([false, true])(
  'sends a trimmed comment with internal=%s, disables Send while pending, then resets and shows it',
  async (internal) => {
    if (internal) backend.user.permissions = ['InquiriesRead']
    await renderDashboard(path)
    const pending = pauseRequest(
      'POST',
      `/v1/inquiries/${firstInquiryId}/comments`,
    )
    const input = screen.getByPlaceholderText('Write a comment...')
    fireEvent.change(input, { target: { value: '  A useful reply  ' } })
    if (internal)
      fireEvent.click(screen.getByRole('checkbox', { name: internalLabel }))
    else expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled()
    await waitFor(() =>
      expect(
        backend.requests.filter((request) => request.method === 'POST'),
      ).toHaveLength(1),
    )
    const write = backend.requests.find((request) => request.method === 'POST')!
    expect(new URL(write.url).pathname).toBe(
      `/v1/inquiries/${firstInquiryId}/comments`,
    )
    expect(await write.json()).toEqual({
      content: 'A useful reply',
      isInternal: internal,
    })
    await act(() => pending.resolve(undefined))
    expect(await screen.findByText('A useful reply')).toBeVisible()
    expect(input).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    if (internal) {
      expect(
        screen.getByRole('checkbox', { name: internalLabel }),
      ).not.toBeChecked()
      expect(screen.getByText('Internal', { exact: true })).toBeVisible()
    }
  },
)

it.each(['', '   '])(
  'does not submit an empty or whitespace-only draft %j',
  async (draft) => {
    await renderDashboard(path)
    fireEvent.change(screen.getByPlaceholderText('Write a comment...'), {
      target: { value: draft },
    })
    const send = screen.getByRole('button', { name: 'Send' })
    expect(send).toBeDisabled()
    fireEvent.click(send)
    expect(
      backend.requests.filter((request) => request.method !== 'GET'),
    ).toHaveLength(0)
  },
)

it('retains a failed comment draft and sends it successfully on retry', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await renderDashboard(path)
  const pending = pauseRequest(
    'POST',
    `/v1/inquiries/${firstInquiryId}/comments`,
  )
  const input = screen.getByPlaceholderText('Write a comment...')
  fireEvent.change(input, { target: { value: 'Keep my draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled()
  await act(() =>
    pending.resolve(
      Response.json(
        { status: 503, code: 'unavailable', title: 'Unavailable' },
        { status: 503 },
      ),
    ),
  )
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled(),
  )
  expect(input).toHaveValue('Keep my draft')
  expect(backend.comments).toHaveLength(0)
  backend.intercept = undefined
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(await screen.findByText('Keep my draft')).toBeVisible()
  expect(input).toHaveValue('')
  expect(backend.comments).toHaveLength(1)
})

it('redirects signed-out detail visitors before fetching protected content', async () => {
  backend.signedIn = false
  const { router } = await renderDashboard(path)
  expect(router.state.location.href).toBe(
    '/bff/login?returnTo=%2Fdashboard%2Finquiries',
  )
  expect(backend.requests).toHaveLength(0)
  expect(screen.queryByText('A new website')).not.toBeInTheDocument()
})
