import { test, expect } from '../fixtures/auth'

test('cross-origin logout is rejected and preserves the same user', async ({
  context,
  authenticated,
}) => {
  const before = await context.request.get('/bff/user')
  expect(before.status()).toBe(200)
  const user = await before.json()
  expect(user).toMatchObject({ sub: 'e2e-user' })
  const logout = await context.request.post('/bff/logout', {
    headers: {
      Origin: 'https://untrusted.example',
      'x-csrf-token': authenticated.csrfToken,
    },
  })
  expect(logout.status()).toBe(403)
  expect(logout.headers()['x-content-type-options']).toBe('nosniff')
  expect(await (await context.request.get('/bff/user')).json()).toEqual(user)
})

test('trusted-origin logout rejects an invalid CSRF token and preserves the session', async ({
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Browser baseURL is required')
  const logout = await context.request.post('/bff/logout', {
    headers: {
      Origin: new URL(baseURL).origin,
      'x-csrf-token': 'invalid',
    },
  })
  expect(logout.status()).toBe(403)
  expect((await context.request.get('/bff/user')).status()).toBe(200)
})

test('trusted logout with this session CSRF token ends the session', async ({
  context,
  baseURL,
  authenticated,
}) => {
  if (!baseURL) throw new Error('Browser baseURL is required')
  expect((await context.request.get('/bff/user')).status()).toBe(200)
  const logout = await context.request.post('/bff/logout', {
    headers: {
      Origin: new URL(baseURL).origin,
      'x-csrf-token': authenticated.csrfToken,
    },
    maxRedirects: 0,
  })
  expect(logout.ok()).toBe(true)
  expect((await context.request.get('/bff/user')).status()).toBe(401)
})

test('direct API access is unavailable without forwarding to the backend', async ({
  context,
  request,
  authenticated,
}) => {
  const observations = `${process.env.BFF_API_BASE_URL}/__sessions/${authenticated.owner}/requests`
  const before = await (await request.get(observations)).json()
  const direct = await context.request.get('/api/v1/inquiries')
  expect(direct.status()).toBe(404)
  expect(await (await request.get(observations)).json()).toEqual(before)
})

test('a real notification mutation succeeds locally and rejects a cross-origin replay without another write', async ({
  page,
  context,
  request,
  authenticated,
}) => {
  await page.goto('/dashboard/notifications')
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  const bell = page.getByRole('dialog')
  const pending = page.waitForRequest(
    (req) => req.method() === 'POST' && req.url().includes('/_serverFn/'),
  )
  await bell
    .getByRole('button', { name: 'Mark all as read', exact: true })
    .click()
  const legitimate = await pending
  await expect(
    bell.getByRole('button', { name: 'Mark all as read', exact: true }),
  ).toHaveCount(0)
  const observations = `${process.env.BFF_API_BASE_URL}/__sessions/${authenticated.owner}/requests`
  const before: unknown = await (await request.get(observations)).json()
  const replay = await context.request.post(legitimate.url(), {
    headers: {
      'content-type': legitimate.headers()['content-type'],
      Origin: 'https://untrusted.example',
    },
    data: legitimate.postData() ?? '',
  })
  expect(replay.status()).toBe(403)
  expect(await (await request.get(observations)).json()).toEqual(before)
})
