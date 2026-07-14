self.addEventListener('push', (event) => {
  const { title, body, data } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      data,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { type, entityId } = event.notification.data || {}

  const routeMap = {
    TaskAssigned: `/dashboard/tasks/${entityId}`,
    TaskCompleted: `/dashboard/tasks/${entityId}`,
    TaskComment: `/dashboard/tasks/${entityId}`,
    InquirySubmitted: `/dashboard/inquiries/${entityId}`,
    InquiryStatusChanged: `/dashboard/inquiries/${entityId}`,
    BillingInvoice: '/dashboard/billing',
  }

  const url = routeMap[type] || '/dashboard/notifications'

  event.waitUntil(clients.openWindow(url))
})
