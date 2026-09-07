import { test, expect } from '../fixtures/auth'

test('authenticated session reaches inquiries through the real server', async ({
  page,
  request,
}) => {
  const response = await page.goto('/dashboard/inquiries')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/dashboard\/inquiries/)
  await expect(
    page.getByText('Inquiries you submit will appear here.'),
  ).toBeVisible()
  const forwarded = await request.get(
    `${process.env.BFF_API_BASE_URL}/__requests`,
  )
  expect(await forwarded.json()).toContainEqual({
    path: '/v1/inquiries/submitted',
    authenticated: true,
  })
})

test('notification bell displays backend data and marks it read', async ({
  page,
}) => {
  await page.goto('/dashboard/notifications')
  await expect(
    page.getByText('Browser fixture notification').first(),
  ).toBeVisible()
  await page.getByRole('button', { name: /notifications/i }).click()
  await expect(
    page.getByRole('button', { name: /mark all.*read/i }).last(),
  ).toBeVisible()
  await page
    .getByRole('button', { name: /mark all.*read/i })
    .last()
    .click()
  await expect(
    page.getByRole('button', { name: /mark all.*read/i }),
  ).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: /mark all.*read/i }),
  ).toBeDisabled()
})
