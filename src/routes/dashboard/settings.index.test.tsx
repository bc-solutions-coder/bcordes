import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import type { NotificationSettings } from '@/lib/wallow/types'
import { renderWithProviders } from '@/test/helpers/render'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchNotificationSettings = vi.fn()
const mockUpdateChannelSetting = vi.fn()

vi.mock('@/server-fns/notifications', () => ({
  fetchNotificationSettings: (...args: Array<unknown>) =>
    mockFetchNotificationSettings(...args),
  updateChannelSetting: (...args: Array<unknown>) =>
    mockUpdateChannelSetting(...args),
}))

vi.mock('@/server-fns/auth', () => ({
  serverRequireAuth: vi.fn(),
}))

const mockPushState = {
  isSupported: true,
  isRegistered: false,
  permission: 'default' as string,
  enable: vi.fn(),
  disable: vi.fn(),
  sendTest: vi.fn(),
}

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => mockPushState,
}))

const mockUseLoaderData = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => ({
    ...config,
    useLoaderData: () => mockUseLoaderData(),
  }),
}))

// ---------------------------------------------------------------------------
// Import route after mocks
// ---------------------------------------------------------------------------

const routeModule = await import('./settings.index')
const routeConfig = routeModule.Route as unknown as {
  loader: () => Promise<Array<NotificationSettings>>
  component: React.ComponentType
}

const SettingsPage = routeConfig.component

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultSettings: Array<NotificationSettings> = [
  { channelType: 'email', isEnabled: true },
  { channelType: 'sms', isEnabled: false },
  { channelType: 'push', isEnabled: false },
  { channelType: 'in_app', isEnabled: true },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('settings.index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateChannelSetting.mockResolvedValue(undefined)
    // Reset push state
    mockPushState.isSupported = true
    mockPushState.isRegistered = false
    mockPushState.permission = 'default'
    mockPushState.enable.mockResolvedValue(undefined)
    mockPushState.disable.mockResolvedValue(undefined)
    mockPushState.sendTest.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  // ---- Loader tests ----

  describe('loader', () => {
    it('returns result of fetchNotificationSettings', async () => {
      mockFetchNotificationSettings.mockResolvedValue(defaultSettings)

      const result = await routeConfig.loader()

      expect(mockFetchNotificationSettings).toHaveBeenCalledOnce()
      expect(result).toEqual(defaultSettings)
    })
  })

  // ---- Component tests ----

  describe('component', () => {
    it('renders channel toggle rows', () => {
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      expect(screen.getByText('Email')).toBeTruthy()
      expect(screen.getByText('Receive notifications via email')).toBeTruthy()
      expect(screen.getByText('SMS')).toBeTruthy()
      expect(screen.getByText('Push')).toBeTruthy()
      expect(screen.getByText('In-App')).toBeTruthy()
    })

    it('renders the Settings header', () => {
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    })

    it('renders Notifications card title and description', () => {
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      expect(screen.getByText('Notifications')).toBeTruthy()
      expect(
        screen.getByText('Choose how you want to receive notifications'),
      ).toBeTruthy()
    })

    it('push channel switch is disabled when not supported', () => {
      mockPushState.isSupported = false
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      // Find the Push row
      const pushLabel = screen.getByText('Push')
      const pushRow = pushLabel.closest(
        'div.flex.items-center.justify-between',
      )!
      const pushSwitch = pushRow.querySelector(
        'button[role="switch"]',
      ) as HTMLButtonElement
      expect(pushSwitch).toBeTruthy()
      expect(pushSwitch.disabled).toBe(true)
    })

    it('push channel switch is disabled when permission is denied', () => {
      mockPushState.permission = 'denied'
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      const pushLabel = screen.getByText('Push')
      const pushRow = pushLabel.closest(
        'div.flex.items-center.justify-between',
      )!
      const pushSwitch = pushRow.querySelector(
        'button[role="switch"]',
      ) as HTMLButtonElement
      expect(pushSwitch).toBeTruthy()
      expect(pushSwitch.disabled).toBe(true)
    })

    it('"Send test notification" visible when push.isRegistered', () => {
      mockPushState.isRegistered = true
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      expect(
        screen.getByRole('button', { name: 'Send test notification' }),
      ).toBeTruthy()
    })

    it('"Send test notification" not visible when push is not registered', () => {
      mockPushState.isRegistered = false
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      expect(
        screen.queryByRole('button', { name: 'Send test notification' }),
      ).toBeNull()
    })

    it('toggling a non-push channel calls updateChannelSetting', async () => {
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      // The SMS switch is the second non-push switch. Find by associated label text.
      // Switches are rendered per channel. Find the SMS row switch.
      const smsDescription = screen.getByText(
        'Receive notifications via text message',
      )
      const smsRow = smsDescription.closest(
        'div.flex.items-center.justify-between',
      )!
      const smsSwitch = smsRow.querySelector('button[role="switch"]')!

      fireEvent.click(smsSwitch)

      // Wait for the async handleToggle to resolve
      await vi.waitFor(() => {
        expect(mockUpdateChannelSetting).toHaveBeenCalledWith({
          data: { channelType: 'sms', isEnabled: true },
        })
      })
    })

    it('clicking "Send test notification" calls push.sendTest', async () => {
      mockPushState.isRegistered = true
      mockUseLoaderData.mockReturnValue(defaultSettings)

      renderWithProviders(<SettingsPage />)

      const btn = screen.getByRole('button', {
        name: 'Send test notification',
      })
      fireEvent.click(btn)

      await vi.waitFor(() => {
        expect(mockPushState.sendTest).toHaveBeenCalledOnce()
      })
    })
  })
})
