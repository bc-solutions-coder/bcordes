import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deregisterPushDevice,
  fetchVapidPublicKey,
  listPushDevices,
  registerPushDevice,
  sendTestPush,
} from '@/server-fns/notifications'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const queryClient = useQueryClient()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] =
    useState<NotificationPermission>('default')

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const devicesQuery = useQuery({
    queryKey: ['push-devices'],
    queryFn: () => listPushDevices(),
    enabled: isSupported,
  })

  const isRegistered = (devicesQuery.data?.length ?? 0) > 0

  const enableMutation = useMutation({
    mutationFn: async () => {
      const vapidKey = await fetchVapidPublicKey()
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      setPermission(Notification.permission)

      const json = subscription.toJSON()
      return registerPushDevice({
        data: {
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-devices'] })
    },
    onError: (error) => {
      console.error('Failed to enable push notifications:', error)
    },
  })

  const disableMutation = useMutation({
    mutationFn: async () => {
      const devices = devicesQuery.data ?? (await listPushDevices())
      if (devices.length > 0) {
        await deregisterPushDevice({ data: { id: devices[0].id } })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-devices'] })
    },
    onError: (error) => {
      console.error('Failed to disable push notifications:', error)
    },
  })

  const testMutation = useMutation({
    mutationFn: () => sendTestPush(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-devices'] })
    },
    onError: (error) => {
      console.error('Failed to send test push:', error)
    },
  })

  return {
    isSupported,
    permission,
    isRegistered,
    enable: enableMutation.mutateAsync,
    disable: disableMutation.mutateAsync,
    sendTest: testMutation.mutateAsync,
  }
}
