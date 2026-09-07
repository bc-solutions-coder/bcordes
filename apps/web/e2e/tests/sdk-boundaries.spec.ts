import { test, expect } from '../fixtures/auth'

test('SDK session survives rejected logout and direct API access is restricted', async ({
  context,
}) => {
  const user = await context.request.get('/bff/user')
  expect(user.status()).toBe(200)
  expect(await user.json()).toMatchObject({ sub: 'e2e-user' })

  const logout = await context.request.post('/bff/logout', {
    headers: { Origin: 'https://untrusted.example', 'x-csrf-token': 'invalid' },
  })
  expect(logout.status()).toBe(403)
  expect(logout.headers()['x-content-type-options']).toBe('nosniff')
  expect((await context.request.get('/bff/user')).status()).toBe(200)

  const direct = await context.request.get('/api/v1/inquiries')
  expect(direct.status()).toBe(404)
  const mutation = await context.request.post('/_serverFn/unknown', {
    headers: { Origin: 'https://untrusted.example' },
  })
  expect(mutation.status()).toBe(403)
})
