import { test, expect } from '../fixtures/auth'

test('authenticated session reaches inquiries through the real server', async ({
  page,
  request,
  authenticated,
}) => {
  const response = await page.goto('/dashboard/inquiries')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/dashboard\/inquiries/)
  await expect(
    page.getByText('Inquiries you submit will appear here.'),
  ).toBeVisible()
  const forwarded = await request.get(
    `${process.env.BFF_API_BASE_URL}/__sessions/${authenticated.owner}/requests`,
  )
  expect(await forwarded.json()).toContainEqual({
    path: '/v1/inquiries/submitted',
    method: 'GET',
    owner: authenticated.owner,
    credential: 'user',
  })
})

test('notification bell marks this session read and preserves zero unread after reload', async ({
  page,
  request,
  authenticated,
}) => {
  await page.goto('/dashboard/notifications')
  const trigger = page.getByRole('button', {
    name: 'Notifications',
    exact: true,
  })
  await expect(trigger).toHaveText('1')
  await trigger.click()
  const bell = page.getByRole('dialog')
  await expect(
    bell.getByText('Browser fixture notification', { exact: true }),
  ).toBeVisible()
  await bell
    .getByRole('button', { name: 'Mark all as read', exact: true })
    .click()
  await expect(trigger).toHaveText('')
  await expect(
    bell.getByRole('button', { name: 'Mark all as read', exact: true }),
  ).toHaveCount(0)
  const forwarded = await request.get(
    `${process.env.BFF_API_BASE_URL}/__sessions/${authenticated.owner}/requests`,
  )
  expect(await forwarded.json()).toContainEqual({
    method: 'POST',
    path: '/v1/notifications/read-all',
    owner: authenticated.owner,
    credential: 'user',
  })
  await page.reload()
  await expect(
    page.getByText('Browser fixture notification', { exact: true }),
  ).toBeVisible()
  await expect(trigger).toHaveText('')
  await expect(
    page.getByRole('button', { name: /mark all.*read/i }),
  ).toBeDisabled()
})
