import { test, expect } from '@playwright/test'

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
  // The footer also labels its email link, so select the textbox by role.
  await page.getByRole('textbox', { name: /Email/ }).fill(email)
  await page.getByLabel(/^Message/).fill(message)

  await page.getByRole('combobox', { name: /Project Type/ }).click()
  await page.getByRole('option', { name: projectType }).click()

  await page.getByRole('combobox', { name: /Budget Range/ }).click()
  await page.getByRole('option', { name: budgetRange }).click()

  await page.getByRole('combobox', { name: /Timeline/ }).click()
  await page.getByRole('option', { name: timeline }).click()
}

function trackSubmission(page: import('@playwright/test').Page) {
  let requestCount = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/_server'))
      requestCount++
  })
  return { getRequestCount: () => requestCount }
}

async function openContact(page: import('@playwright/test').Page) {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/auth/me')),
    page.goto('/contact'),
  ])
}

test.describe('Contact Form', () => {
  test('submitting with all fields empty shows client-side validation errors without a network request', async ({
    page,
  }) => {
    const { getRequestCount } = trackSubmission(page)

    await openContact(page)

    await page.getByRole('button', { name: 'Send Message' }).click()

    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Message is required')).toBeVisible()
    await expect(page.getByText('Please select a project type')).toBeVisible()
    await expect(page.getByText('Please select a budget range')).toBeVisible()
    await expect(page.getByText('Please select a timeline')).toBeVisible()

    expect(getRequestCount()).toBe(0)
  })

  test('filling valid fields and submitting shows success confirmation', async ({
    page,
  }) => {
    trackSubmission(page)

    await openContact(page)

    await fillContactForm(page)

    await page.getByRole('button', { name: 'Send Message' }).click()

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
    trackSubmission(page)

    await openContact(page)

    await fillContactForm(page)
    await page.getByRole('button', { name: 'Send Message' }).click()

    await expect(
      page.getByRole('heading', { name: 'Message Sent!' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Send Another Message' }).click()

    await expect(
      page.getByRole('heading', { name: 'Message Sent!' }),
    ).not.toBeVisible()

    await expect(
      page.getByRole('button', { name: 'Send Message' }),
    ).toBeVisible()
    await expect(page.getByLabel(/^Name/)).toHaveValue('')
    await expect(page.getByRole('textbox', { name: /Email/ })).toHaveValue('')
    await expect(page.getByLabel(/^Message/)).toHaveValue('')
  })
})
