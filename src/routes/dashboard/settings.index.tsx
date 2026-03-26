import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, MessageSquare, Settings, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import type { NotificationSettings } from '@/lib/wallow/types'
import { serverRequireAuth } from '@/server-fns/auth'
import {
  fetchNotificationSettings,
  updateChannelSetting,
} from '@/server-fns/notifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const Route = createFileRoute('/dashboard/settings/')({
  beforeLoad: () =>
    serverRequireAuth({ data: { returnTo: '/dashboard/settings' } }),
  loader: () => fetchNotificationSettings(),
  component: SettingsPage,
})

const channels: Array<{
  type: string
  label: string
  description: string
  icon: typeof Mail
}> = [
  {
    type: 'email',
    label: 'Email',
    description: 'Receive notifications via email',
    icon: Mail,
  },
  {
    type: 'sms',
    label: 'SMS',
    description: 'Receive notifications via text message',
    icon: MessageSquare,
  },
  {
    type: 'push',
    label: 'Push',
    description: 'Receive push notifications in your browser',
    icon: Bell,
  },
  {
    type: 'in_app',
    label: 'In-App',
    description: 'Receive notifications within the application',
    icon: Smartphone,
  },
]

function SettingsPage() {
  const initialSettings = Route.useLoaderData()
  const queryClient = useQueryClient()

  const { data: settings } = useQuery<Array<NotificationSettings>>({
    queryKey: ['notification-settings'],
    queryFn: () => fetchNotificationSettings(),
    initialData: initialSettings,
  })

  const [localSettings, setLocalSettings] =
    useState<Array<NotificationSettings>>(settings)

  function isChannelEnabled(channelType: string): boolean {
    const setting = localSettings.find((s) => s.channelType === channelType)
    return setting?.isEnabled ?? false
  }

  async function handleToggle(channelType: string, isEnabled: boolean) {
    const previous = [...localSettings]

    // Optimistic update
    setLocalSettings((prev) =>
      prev.some((s) => s.channelType === channelType)
        ? prev.map((s) =>
            s.channelType === channelType ? { ...s, isEnabled } : s,
          )
        : [...prev, { channelType, isEnabled }],
    )

    try {
      await updateChannelSetting({ data: { channelType, isEnabled } })
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
    } catch (error) {
      // Revert on failure
      setLocalSettings(previous)
      const message =
        error instanceof Error ? error.message : 'Failed to update setting'
      toast.error(message)
    }
  }

  const push = usePushNotifications()

  async function handlePushToggle(checked: boolean) {
    try {
      if (checked) {
        await push.enable()
        toast.success('Push notifications enabled')
      } else {
        await push.disable()
        toast.success('Push notifications disabled')
      }
    } catch {
      toast.error('Failed to update push notifications')
    }
  }

  async function handleSendTest() {
    try {
      await push.sendTest()
      toast.success('Test notification sent')
    } catch {
      toast.error('Failed to send test notification')
    }
  }

  function renderPushControl() {
    if (!push.isSupported) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Switch checked={false} disabled />
            </span>
          </TooltipTrigger>
          <TooltipContent>Not supported in this browser</TooltipContent>
        </Tooltip>
      )
    }

    if (push.permission === 'denied') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Switch checked={false} disabled />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Permission blocked — reset in browser settings
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <div className="flex items-center gap-2">
        {push.isRegistered && (
          <Button variant="outline" size="sm" onClick={handleSendTest}>
            Send test notification
          </Button>
        )}
        <Switch
          checked={push.isRegistered}
          onCheckedChange={handlePushToggle}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Card className="border-border bg-secondary">
          <CardHeader>
            <CardTitle className="text-foreground">Notifications</CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channels.map((channel) => {
              const Icon = channel.icon
              const isPush = channel.type === 'push'
              return (
                <div
                  key={channel.type}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {channel.label}
                      </p>
                      <p className="text-xs text-foreground-secondary">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                  {isPush ? (
                    renderPushControl()
                  ) : (
                    <Switch
                      checked={isChannelEnabled(channel.type)}
                      onCheckedChange={(checked) =>
                        handleToggle(channel.type, checked)
                      }
                    />
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
