import { test, expect } from '../fixtures/guest'

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
  await expect(page.getByRole('option', { name: timeline })).not.toBeVisible()
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
    guestBackend,
  }) => {
    await openContact(page)

    await page.getByRole('button', { name: 'Send Message' }).click()

    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Message is required')).toBeVisible()
    await expect(page.getByText('Please select a project type')).toBeVisible()
    await expect(page.getByText('Please select a budget range')).toBeVisible()
    await expect(page.getByText('Please select a timeline')).toBeVisible()

    expect(
      guestBackend
        .requests(guestBackend.owner)
        .filter(
          (item) => item.method === 'POST' && item.path === '/v1/inquiries',
        ),
    ).toHaveLength(0)
  })

  test('filling valid fields and submitting shows success confirmation', async ({
    page,
    guestBackend,
  }) => {
    await openContact(page)

    await fillContactForm(page)

    await page.getByRole('button', { name: 'Send Message' }).click()

    await expect(
      page.getByRole('heading', { name: 'Message Sent!' }),
    ).toBeVisible()
    expect(
      guestBackend
        .requests(guestBackend.owner)
        .filter((item) => item.path === '/v1/inquiries'),
    ).toEqual([
      {
        method: 'POST',
        path: '/v1/inquiries',
        owner: guestBackend.owner,
        credential: 'service',
        body: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '',
          company: null,
          projectType: 'Frontend',
          budgetRange: '$5k-$15k',
          timeline: '1-3 months',
          message: 'I would like to discuss a new web application project.',
        },
      },
    ])
    await expect(
      page.getByText(/get back to you within 24-48 hours/i),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Send Another Message' }),
    ).toBeVisible()
  })

  test('"Send Another Message" resets the form to its empty initial state', async ({
    page,
    guestBackend,
  }) => {
    await openContact(page)

    await fillContactForm(page)
    await page.getByLabel(/^Phone/).fill('555-0100')
    await page.getByLabel(/^Company/).fill('Browser Company')
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
    await expect(page.getByLabel(/^Phone/)).toHaveValue('')
    await expect(page.getByLabel(/^Company/)).toHaveValue('')
    for (const [name, placeholder] of [
      ['Project Type', 'Select project type'],
      ['Budget Range', 'Select budget range'],
      ['Timeline', 'Select timeline'],
    ]) {
      await expect(
        page.getByRole('combobox', { name: new RegExp(name) }),
      ).toContainText(placeholder)
    }
    await page.getByRole('button', { name: 'Send Message' }).click()
    for (const message of [
      'Name is required',
      'Email is required',
      'Message is required',
      'Please select a project type',
      'Please select a budget range',
      'Please select a timeline',
    ])
      await expect(page.getByText(message)).toBeVisible()
    const submissions = guestBackend
      .requests(guestBackend.owner)
      .filter((item) => item.path === '/v1/inquiries')
    expect(submissions).toHaveLength(1)
    expect(submissions[0].body).toMatchObject({
      phone: '555-0100',
      company: 'Browser Company',
    })
  })
})
