import { test, expect } from '@playwright/test'
import { mockRoute } from '../mocks/api'

/**
 * Helper to fill in all required fields of the contact form.
 * Uses accessible selectors (label text) where possible.
 */
async function fillContactForm(
  page: import('@playwright/test').Page,
  overrides: {
    name?: string
    email?: string
    message?: string
    projectType?: string
    budgetRange?: string
    timeline?: string
  } = {},
) {
  const {
    name = 'Jane Doe',
    email = 'jane@example.com',
    message = 'I would like to discuss a new web application project.',
    projectType = 'Frontend Development',
    budgetRange = '$5k - $15k',
    timeline = '1 - 3 months',
  } = overrides

  await page.getByLabel(/^Name/).fill(name)
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Message/).fill(message)

  // Select "Project Type"
  await page.getByRole('combobox', { name: /Project Type/ }).click()
  await page.getByRole('option', { name: projectType }).click()

  // Select "Budget Range"
  await page.getByRole('combobox', { name: /Budget Range/ }).click()
  await page.getByRole('option', { name: budgetRange }).click()

  // Select "Timeline"
  await page.getByRole('combobox', { name: /Timeline/ }).click()
  await page.getByRole('option', { name: timeline }).click()
}

/**
 * Mock the TanStack Start server-function POST that backs `submitInquiry`.
 * The browser sends a POST to a `/_server` path; we intercept it and
 * return a successful inquiry response.
 */
async function mockSubmitInquiry(page: import('@playwright/test').Page) {
  let requestCount = 0

  await mockRoute(page, /\/_server/, async (route) => {
    const request = route.request()

    if (request.method() === 'POST') {
      requestCount++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '',
          company: undefined,
          projectType: 'Frontend',
          budgetRange: '$5k-$15k',
          timeline: '1-3 months',
          message: 'I would like to discuss a new web application project.',
          status: 'new',
          createdAt: new Date().toISOString(),
        }),
      })
    } else {
      await route.continue()
    }
  })

  return { getRequestCount: () => requestCount }
}

test.describe('Contact Form', () => {
  test('submitting with all fields empty shows client-side validation errors without a network request', async ({
    page,
  }) => {
    const { getRequestCount } = await mockSubmitInquiry(page)

    await page.goto('/contact')

    // Click submit without filling anything
    await page.getByRole('button', { name: 'Send Message' }).click()

    // Expect client-side validation messages for required fields
    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Message is required')).toBeVisible()
    await expect(page.getByText('Please select a project type')).toBeVisible()
    await expect(page.getByText('Please select a budget range')).toBeVisible()
    await expect(page.getByText('Please select a timeline')).toBeVisible()

    // No network request should have been made
    expect(getRequestCount()).toBe(0)
  })

  test('filling valid fields and submitting shows success confirmation', async ({
    page,
  }) => {
    await mockSubmitInquiry(page)

    await page.goto('/contact')

    await fillContactForm(page)

    await page.getByRole('button', { name: 'Send Message' }).click()

    // Success state should appear
    await expect(
      page.getByRole('heading', { name: 'Message Sent!' }),
    ).toBeVisible()
    await expect(
      page.getByText(/get back to you within 24-48 hours/i),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Send Another Message' }),
    ).toBeVisible()
  })

  test('"Send Another Message" resets the form to its empty initial state', async ({
    page,
  }) => {
    await mockSubmitInquiry(page)

    await page.goto('/contact')

    // Submit a valid form first
    await fillContactForm(page)
    await page.getByRole('button', { name: 'Send Message' }).click()

    // Wait for success state
    await expect(
      page.getByRole('heading', { name: 'Message Sent!' }),
    ).toBeVisible()

    // Click reset button
    await page.getByRole('button', { name: 'Send Another Message' }).click()

    // Success state should be gone
    await expect(
      page.getByRole('heading', { name: 'Message Sent!' }),
    ).not.toBeVisible()

    // Form should be visible again with empty fields
    await expect(
      page.getByRole('button', { name: 'Send Message' }),
    ).toBeVisible()
    await expect(page.getByLabel(/^Name/)).toHaveValue('')
    await expect(page.getByLabel(/^Email/)).toHaveValue('')
    await expect(page.getByLabel(/^Message/)).toHaveValue('')
  })
})
