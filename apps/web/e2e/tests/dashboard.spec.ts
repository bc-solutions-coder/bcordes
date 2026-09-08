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

test('bell navigation survives a pending failed read and a later retry persists', async ({
  page,
  request,
  authenticated,
}) => {
  const errors: Array<string> = []
  page.on('pageerror', (error) => errors.push(error.message))
  const controlURL = `${process.env.BFF_API_BASE_URL}/__sessions/${authenticated.owner}/control`
  const observationsURL = `${process.env.BFF_API_BASE_URL}/__sessions/${authenticated.owner}/requests`
  const readPath = '/v1/notifications/00000000-0000-4000-8000-000000000001/read'
  await page.goto('/dashboard/inquiries')
  const trigger = page.getByRole('button', {
    name: 'Notifications',
    exact: true,
  })
  await expect(trigger).toHaveText('1')
  expect(
    (
      await request.post(controlURL, {
        data: { method: 'POST', path: readPath, pending: true, status: 503 },
      })
    ).ok(),
  ).toBe(true)
  await trigger.click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Browser fixture notification/ })
    .click()
  await expect(page).toHaveURL(/\/dashboard\/notifications\/?$/)
  await expect(
    page.getByRole('heading', { name: 'Notifications', level: 1 }),
  ).toBeVisible()
  await expect(trigger).toHaveText('1')
  await expect
    .poll(async () => (await request.get(observationsURL)).json())
    .toContainEqual({
      method: 'POST',
      path: readPath,
      owner: authenticated.owner,
      credential: 'user',
    })
  expect((await request.delete(controlURL)).ok()).toBe(true)
  await expect(
    page.getByText('Failed to mark notification as read', { exact: true }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/dashboard\/notifications\/?$/)
  await expect(trigger).toHaveText('1')
  await page.reload()
  await expect(trigger).toHaveText('1')
  await trigger.click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Browser fixture notification/ })
    .click()
  await expect(trigger).toHaveText('')
  await page.reload()
  await expect(trigger).toHaveText('')
  await expect(
    page.getByRole('button', { name: 'Mark all as read', exact: true }),
  ).toBeDisabled()
  expect(errors).toEqual([])
})
