import { test, expect } from '../fixtures/auth'

for (const condition of ['unsupported', 'blocked'] as const) {
  test(`explains why browser push is ${condition}`, async ({ page }) => {
    await page.addInitScript((state) => {
      if (state === 'unsupported') Reflect.deleteProperty(window, 'PushManager')
      else
        Object.defineProperty(Notification, 'permission', {
          get: () => 'denied',
        })
    }, condition)
    await page.goto('/dashboard/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    const row = page
      .locator('div')
      .filter({ has: page.getByText('Push', { exact: true }) })
      .filter({ has: page.getByRole('switch') })
      .last()
    const control = row.getByRole('switch')
    await expect(control).toBeDisabled()
    await expect(control).not.toBeChecked()
    await control.hover({ force: true })
    await expect(
      page.getByText(
        condition === 'unsupported'
          ? 'Not supported in this browser'
          : 'Permission blocked — reset in browser settings',
        { exact: true },
      ),
    ).toBeVisible()
  })
}
