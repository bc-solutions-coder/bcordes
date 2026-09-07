import { toJSONAsync } from 'seroval'
import { z } from 'zod'
import { test, expect } from '../fixtures/auth'

test('validates authorization input before profile access through the built transport', async ({
  page,
  context,
  request,
  authenticated,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Browser User/ }).click()
  const pending = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes('/_serverFn/') &&
      decodeURIComponent(req.url()).includes('returnTo'),
  )
  await page.getByRole('menuitem', { name: 'Dashboard' }).click()
  const legitimate = await pending
  await expect(
    page.getByText('Inquiries you submit will appear here.'),
  ).toBeVisible()
  await page.close()
  const observations = `${process.env.BFF_API_BASE_URL}/__sessions/${authenticated.owner}/requests`
  const profileCount = async () => {
    const response = await request.get(observations)
    expect(response.ok()).toBe(true)
    return z
      .array(z.object({ path: z.string() }))
      .parse(await response.json())
      .filter((item) => item.path === '/v1/identity/users/me').length
  }
  const send = async (data: unknown) => {
    const url = new URL(legitimate.url())
    url.searchParams.set('payload', JSON.stringify(await toJSONAsync({ data })))
    return context.request.get(url.toString(), {
      headers: legitimate.headers(),
      maxRedirects: 0,
    })
  }
  for (const data of [
    {},
    { returnTo: '/dashboard' },
    { returnTo: '' },
    { returnTo: 'https://example.com/path' },
  ]) {
    const before = await profileCount()
    const response = await send(data)
    expect(response.status()).toBe(200)
    expect(await profileCount()).toBe(before + 1)
  }
  for (const data of [
    null,
    [],
    'dashboard',
    42,
    { returnTo: 42 },
    { returnTo: null },
    { returnTo: {} },
  ]) {
    const before = await profileCount()
    const response = await send(data)
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('invalid_type')
    expect(await profileCount()).toBe(before)
  }
})
