import { test, expect } from '../fixtures/auth'

test('distinguishes unread and read appearance after the saved notification is read', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 1000, height: 700 })
  await page.goto('/dashboard/notifications')
  const row = page.getByRole('button', { name: /Browser fixture notification/ })
  const title = row.getByText('Browser fixture notification', { exact: true })
  await expect(title).toBeVisible()
  const unread = await title.evaluate((element) => ({
    weight: getComputedStyle(element).fontWeight,
    color: getComputedStyle(element).color,
  }))
  const unreadBackground = await row.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  await row.click()
  await page.mouse.move(900, 600)
  await expect(
    page.getByRole('button', { name: 'Notifications', exact: true }),
  ).toHaveText('')
  await expect(title).not.toHaveCSS('font-weight', unread.weight)
  await expect(title).not.toHaveCSS('color', unread.color)
  await expect(row).not.toHaveCSS('background-color', unreadBackground)
  await row.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    )
  })
  const read = await title.evaluate((element) => ({
    weight: getComputedStyle(element).fontWeight,
    color: getComputedStyle(element).color,
  }))
  expect(Number(read.weight)).toBeLessThan(Number(unread.weight))
  const readBackground = await row.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  await page.reload()
  await expect(title).toHaveCSS('font-weight', read.weight)
  await expect(title).toHaveCSS('color', read.color)
  await expect(row).toHaveCSS('background-color', readBackground)
})
