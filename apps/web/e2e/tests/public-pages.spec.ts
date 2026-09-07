import { test, expect } from '@playwright/test'

test.describe('Public Pages', () => {
  test.describe('Home page', () => {
    test('loads with 200 status and displays the hero headline', async ({
      page,
    }) => {
      const response = await page.goto('/')
      expect(response?.status()).toBe(200)

      const headline = page.getByRole('heading', {
        name: /Professional\s+Software\s+Engineering/i,
      })
      await expect(headline).toBeVisible()
    })

    test('displays hero call-to-action buttons', async ({ page }) => {
      await page.goto('/')

      const viewProjects = page.getByRole('link', { name: 'View My Projects' })
      await expect(viewProjects).toBeVisible()

      const getInTouch = page
        .getByRole('link', { name: 'Get in Touch' })
        .first()
      await expect(getInTouch).toBeVisible()
    })

    test('displays key statistics', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByText('6+')).toBeVisible()
      await expect(page.getByText('Years Experience')).toBeVisible()
      await expect(page.getByText('25+')).toBeVisible()
      await expect(page.getByText('Projects Delivered')).toBeVisible()
    })

    test('has navigation links pointing to correct hrefs', async ({ page }) => {
      await page.goto('/')

      const nav = page.locator('header')
      await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute(
        'href',
        '/',
      )
      await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute(
        'href',
        '/projects',
      )
      await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute(
        'href',
        '/about',
      )
      await expect(nav.getByRole('link', { name: 'Resume' })).toHaveAttribute(
        'href',
        '/resume',
      )
    })
  })

  test.describe('About page', () => {
    test('loads and contains the about section heading', async ({ page }) => {
      const response = await page.goto('/about')
      expect(response?.status()).toBe(200)

      const heading = page.getByRole('heading', { name: 'Bryan Cordes' })
      await expect(heading).toBeVisible()
    })

    test('displays the role subtitle', async ({ page }) => {
      await page.goto('/about')

      await expect(page.getByText('Full-Stack Software Engineer')).toBeVisible()
    })

    test('displays the "My Approach" values section', async ({ page }) => {
      await page.goto('/about')

      const approachHeading = page.getByRole('heading', {
        name: 'My Approach',
      })
      await expect(approachHeading).toBeVisible()

      // Assert the value titles via their h3 heading role: some titles (e.g.
      // "Clear Communication") also appear as substrings in the body copy, so
      // getByText is ambiguous under strict mode.
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

    test('has navigation links visible', async ({ page }) => {
      await page.goto('/about')

      const nav = page.locator('header')
      await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'About' })).toBeVisible()
    })
  })

  test.describe('Projects page', () => {
    test('loads and displays the page heading', async ({ page }) => {
      const response = await page.goto('/projects')
      expect(response?.status()).toBe(200)

      const heading = page.getByRole('heading', { name: 'Projects', level: 1 })
      await expect(heading).toBeVisible()
    })

    test('lists at least one project card', async ({ page }) => {
      await page.goto('/projects')

      // Project cards are rendered as links with article-like structure
      // containing an h3 title
      const projectCards = page.locator('h3')
      await expect(projectCards.first()).toBeVisible()
      expect(await projectCards.count()).toBeGreaterThanOrEqual(1)
    })

    test('displays project count text', async ({ page }) => {
      await page.goto('/projects')

      await expect(page.getByText(/Showing \d+ of \d+ projects/)).toBeVisible()
    })

    test('has navigation links visible', async ({ page }) => {
      await page.goto('/projects')

      const nav = page.locator('header')
      await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'About' })).toBeVisible()
    })
  })

  test.describe('Contact page', () => {
    test('loads and renders the page heading', async ({ page }) => {
      const response = await page.goto('/contact')
      expect(response?.status()).toBe(200)

      const heading = page.getByRole('heading', {
        name: 'Get in Touch',
        level: 1,
      })
      await expect(heading).toBeVisible()
    })

    test('renders the contact form with required fields', async ({ page }) => {
      await page.goto('/contact')

      // Form labels (scope Email to the textbox: the footer also has an
      // aria-label="Email" mailto link, making getByLabel(/Email/) ambiguous).
      await expect(page.getByLabel(/Name/)).toBeVisible()
      await expect(page.getByRole('textbox', { name: /Email/ })).toBeVisible()
      await expect(page.getByLabel(/Message/)).toBeVisible()

      // Submit button
      const submitButton = page.getByRole('button', { name: 'Send Message' })
      await expect(submitButton).toBeVisible()
    })

    test('renders contact information section', async ({ page }) => {
      await page.goto('/contact')

      await expect(
        page.getByRole('heading', { name: 'Contact Information' }),
      ).toBeVisible()
      await expect(page.getByText('BC@bcordes.dev')).toBeVisible()
      await expect(page.getByText('Available for projects')).toBeVisible()
    })

    test('has navigation links visible', async ({ page }) => {
      await page.goto('/contact')

      const nav = page.locator('header')
      await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'About' })).toBeVisible()
    })
  })
})

test('project navigation opens detail and unknown projects show not found', async ({
  page,
}) => {
  await page.goto('/projects')
  const project = page.locator('main a[href^="/projects/"]').first()
  const path = await project.getAttribute('href')
  expect(path).toBeTruthy()
  await project.click()
  await expect(page).toHaveURL(new RegExp(`${path}$`))
  await expect(page.locator('main h1')).toBeVisible()
  const missing = await page.goto('/projects/does-not-exist-e2e')
  expect(missing?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: /project not found/i }),
  ).toBeVisible()
})

test('unauthenticated dashboard access redirects to login', async ({
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
