import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openPage(page: Page, path: string) {
  const [, response] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/auth/me')),
    page.goto(path),
  ])
  return response
}

test.describe('Public Pages', () => {
  test.describe('Home page', () => {
    test('loads with 200 status and displays the hero headline', async ({
      page,
    }) => {
      const response = await openPage(page, '/')
      expect(response?.status()).toBe(200)

      const headline = page.getByRole('heading', {
        name: /Professional\s+Software\s+Engineering/i,
      })
      await expect(headline).toBeVisible()
    })

    test('hero actions navigate to projects and contact', async ({ page }) => {
      for (const [name, path, heading] of [
        ['View My Projects', '/projects', 'Projects'],
        ['Get in Touch', '/contact', 'Get in Touch'],
      ]) {
        await openPage(page, '/')
        const action = page
          .getByRole('region', { name: 'Introduction' })
          .getByRole('link', { name, exact: true })
        await expect(action).toBeVisible()
        await expect(action).toHaveAttribute('href', path)
        await action.click()
        await expect(page).toHaveURL(path)
        await expect(
          page.getByRole('heading', { name: heading, level: 1, exact: true }),
        ).toBeVisible()
      }
    })

    test('displays key statistics', async ({ page }) => {
      await openPage(page, '/')

      const statistics = page.getByRole('list', { name: 'Key statistics' })
      for (const [label, value] of [
        ['Years Experience', '7+'],
        ['Projects Delivered', '25+'],
      ]) {
        const item = statistics.getByRole('listitem').filter({ hasText: label })
        await expect(item.getByText(value, { exact: true })).toBeVisible()
        await expect(item.getByText(label, { exact: true })).toBeVisible()
      }
    })

    test('header navigation works from home, about, projects and contact', async ({
      page,
    }) => {
      for (const start of ['/', '/about', '/projects', '/contact']) {
        for (const [name, path] of [
          ['Home', '/'],
          ['Projects', '/projects'],
          ['About', '/about'],
          ['Resume', '/resume'],
        ]) {
          await openPage(page, start)
          const link = page
            .getByRole('banner')
            .getByRole('link', { name, exact: true })
          await expect(link).toBeVisible()
          await expect(link).toHaveAttribute('href', path)
          await link.click()
          await expect(page).toHaveURL(path)
          await expect(page.locator('main h1')).toBeVisible()
        }
      }
    })
  })

  test.describe('About page', () => {
    test('loads and contains the about section heading', async ({ page }) => {
      const response = await openPage(page, '/about')
      expect(response?.status()).toBe(200)

      const heading = page.getByRole('heading', { name: 'Bryan Cordes' })
      await expect(heading).toBeVisible()
    })

    test('displays the role subtitle', async ({ page }) => {
      await openPage(page, '/about')

      await expect(page.getByText('Full-Stack Software Engineer')).toBeVisible()
    })

    test('displays the "My Approach" values section', async ({ page }) => {
      await openPage(page, '/about')

      const approachHeading = page.getByRole('heading', {
        name: 'My Approach',
      })
      await expect(approachHeading).toBeVisible()

      // Titles also occur in body text; select headings to avoid ambiguity.
      const values = [
        'Quality-Driven Development',
        'Clear Communication',
        'Modern Tech Stack',
        'Client-Focused Solutions',
      ]
      for (const value of values) {
        await expect(page.getByRole('heading', { name: value })).toBeVisible()
      }
    })
  })

  test.describe('Projects page', () => {
    test('loads and displays the page heading', async ({ page }) => {
      const response = await openPage(page, '/projects')
      expect(response?.status()).toBe(200)

      const heading = page.getByRole('heading', { name: 'Projects', level: 1 })
      await expect(heading).toBeVisible()
    })

    test('lists named projects with their detail links', async ({ page }) => {
      await openPage(page, '/projects')
      for (const [name, slug] of [
        ['Wallow', 'wallow'],
        ['Bcordes', 'bcordes'],
      ]) {
        const card = page.locator(`main a[href="/projects/${slug}"]`)
        await expect(
          card.getByRole('heading', { name, exact: true }),
        ).toBeVisible()
      }
    })

    test('project filters show the correct named results and reset the count', async ({
      page,
    }) => {
      await openPage(page, '/projects')
      await expect(
        page.getByText('Showing 2 of 2 projects', { exact: true }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'React', exact: true }).click()
      await expect(
        page.getByText('Showing 1 of 2 projects', { exact: false }),
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { name: 'Bcordes', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { name: 'Wallow', exact: true }),
      ).toHaveCount(0)
      await page.getByRole('button', { name: 'All', exact: true }).click()
      await expect(
        page.getByText('Showing 2 of 2 projects', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { name: 'Wallow', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { name: 'Bcordes', exact: true }),
      ).toBeVisible()
    })
  })

  test.describe('Contact page', () => {
    test('loads and renders the page heading', async ({ page }) => {
      const response = await openPage(page, '/contact')
      expect(response?.status()).toBe(200)

      const heading = page.getByRole('heading', {
        name: 'Get in Touch',
        level: 1,
      })
      await expect(heading).toBeVisible()
    })

    test('renders the named contact fields and submit button', async ({
      page,
    }) => {
      await openPage(page, '/contact')

      // The footer also labels its email link, so select the textbox by role.
      await expect(page.getByLabel(/Name/)).toBeVisible()
      await expect(page.getByRole('textbox', { name: /Email/ })).toBeVisible()
      await expect(page.getByLabel(/Message/)).toBeVisible()

      const submitButton = page.getByRole('button', { name: 'Send Message' })
      await expect(submitButton).toBeVisible()
    })

    test('renders contact information section', async ({ page }) => {
      await openPage(page, '/contact')

      await expect(
        page.getByRole('heading', { name: 'Contact Information' }),
      ).toBeVisible()
      await expect(page.getByText('BC@bcordes.dev')).toBeVisible()
      await expect(page.getByText('Available for projects')).toBeVisible()
    })
  })
})

test('project navigation opens detail and unknown projects show not found', async ({
  page,
}) => {
  await openPage(page, '/projects')
  await page.locator('main a[href="/projects/wallow"]').click()
  await expect(page).toHaveURL('/projects/wallow')
  await expect(
    page.getByRole('heading', { name: 'Wallow', level: 1, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Wallow is a modular, multi-tenant SaaS backend', {
      exact: false,
    }),
  ).toBeVisible()
  const missing = await openPage(page, '/projects/does-not-exist-e2e')
  expect(missing?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: /project not found/i }),
  ).toBeVisible()
})

test('unauthenticated inquiry request returns a 307 login redirect with returnTo', async ({
  request,
}) => {
  const response = await request.get('/dashboard/inquiries', {
    maxRedirects: 0,
  })
  expect(response.status()).toBe(307)
  expect(response.headers().location).toBe(
    '/bff/login?returnTo=%2Fdashboard%2Finquiries',
  )
})
