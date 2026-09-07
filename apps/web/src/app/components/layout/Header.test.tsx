import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { createMockUser } from '@bcordes/auth/testing'
import { renderRoute } from '../../../../testing/render-route'
import { Header } from './Header'
import type { User } from '@bcordes/auth/types'
import { EventStreamProvider } from '@/features/notifications'

const session = vi.hoisted(() => {
  const state: { user: User | null } = { user: null }
  return state
})
vi.mock('@/shared/auth', () => ({
  useUser: () => ({ user: session.user, isLoading: false }),
}))
vi.mock('@/features/notifications/server-fns/notifications', () => ({
  fetchNotifications: () => Promise.resolve([]),
  fetchUnreadCount: () => Promise.resolve(0),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}))

beforeEach(() => {
  session.user = null
  vi.stubGlobal('scrollTo', vi.fn())
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: 0,
  })
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
})

async function renderHeader() {
  return renderRoute(
    <EventStreamProvider>
      <Header />
    </EventStreamProvider>,
  )
}

it('links Home, Projects, About, and Resume to their public pages', async () => {
  await renderHeader()
  const header = within(screen.getByRole('banner'))
  for (const [name, href] of [
    ['Home', '/'],
    ['Projects', '/projects'],
    ['About', '/about'],
    ['Resume', '/resume'],
  ]) {
    expect(header.getByRole('link', { name })).toHaveAttribute('href', href)
  }
})

it('links the BC Solutions logo to the home page', async () => {
  await renderHeader()
  expect(screen.getByRole('link', { name: /BC Solutions/ })).toHaveAttribute(
    'href',
    '/',
  )
})

it.each(['visitor', 'customer', 'administrator'])(
  'sets contact-link availability for a %s using inquiry-read permission',
  async (kind) => {
    session.user =
      kind === 'visitor'
        ? null
        : createMockUser({
            permissions: kind === 'administrator' ? ['InquiriesRead'] : [],
          })
    await renderHeader()
    if (kind === 'administrator')
      expect(
        screen.queryByRole('link', { name: 'Get in Touch' }),
      ).not.toBeInTheDocument()
    else
      expect(
        screen.getByRole('link', { name: 'Get in Touch' }),
      ).toHaveAttribute('href', '/contact')
  },
)

it.each([0, 100])(
  'offers account and mobile navigation while scrolling from %i',
  async (initialScroll) => {
    window.scrollY = initialScroll
    session.user = createMockUser({ name: 'Customer Example' })
    await renderHeader()
    for (const position of [100, 100, 0]) {
      window.scrollY = position
      fireEvent.scroll(window)
    }
    fireEvent.click(screen.getByRole('button', { name: /Customer Example/ }))
    expect(
      await screen.findByRole('menuitem', { name: 'Dashboard' }),
    ).toHaveAttribute('href', '/dashboard/inquiries')
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    )
    expect(await screen.findByRole('dialog')).toBeVisible()
    expect(
      within(screen.getByRole('dialog')).getByRole('link', {
        name: 'Projects',
      }),
    ).toHaveAttribute('href', '/projects')
  },
)
