import { test, expect } from '../fixtures/auth'

test('shows a generic production fallback and returns home after a controlled authorization service failure', async ({
  page,
  request,
  authenticated,
}) => {
  const control = `${process.env.BFF_API_BASE_URL}/__sessions/${authenticated.owner}/control`
  expect(
    (
      await request.post(control, {
        data: {
          method: 'GET',
          path: '/v1/identity/users/me',
          status: 503,
          body: {
            type: 'https://fixture.invalid/problems/authorization',
            code: 'Fixture.AuthorizationUnavailable',
            title: 'Private authorization diagnostic fixture',
            detail: 'Private authorization diagnostic fixture',
            status: 503,
          },
        },
      })
    ).ok(),
  ).toBe(true)
  await page.goto('/dashboard/inquiries')
  await expect(
    page.getByRole('heading', { name: 'Something Went Wrong' }),
  ).toBeVisible()
  await expect(
    page.getByText('An unexpected error occurred. Please try again.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible()
  await expect(
    page.getByText('Private authorization diagnostic fixture', {
      exact: false,
    }),
  ).toHaveCount(0)
  expect((await request.delete(control)).ok()).toBe(true)
  await page.getByRole('link', { name: 'Go Home' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('link', { name: 'View My Projects' }),
  ).toBeVisible()
})
