import { test, expect } from '../fixtures/components'

test('reveals at the requested threshold, keeps the reveal after exit, and applies caller presentation', async ({
  page,
  motionURL,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(motionURL)
  const target = page.locator('#reveal > div')
  await expect(target).toHaveCSS('opacity', '0')
  await expect(target).toHaveCSS('transition-delay', '0.3s')
  await expect(target).toHaveCSS('color', 'rgb(12, 34, 56)')
  await target.evaluate((element) =>
    window.scrollBy(
      0,
      element.getBoundingClientRect().top - window.innerHeight + 50,
    ),
  )
  await page.waitForTimeout(1000)
  await expect(target).toHaveCSS('opacity', '0')
  await target.evaluate((element) =>
    window.scrollBy(
      0,
      element.getBoundingClientRect().top - window.innerHeight + 160,
    ),
  )
  await expect(target).toHaveCSS('opacity', '1')
  await expect(target).toHaveCSS('translate', '0px')
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(target).toHaveCSS('opacity', '1')
})

test('shows content immediately and removes its requested delay under reduced motion', async ({
  page,
  motionURL,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(motionURL)
  const target = page.locator('#reveal > div')
  await expect(target).toHaveCSS('opacity', '1')
  await expect(target).toHaveCSS('transition-delay', '0s')
  await expect(target).toHaveCSS('translate', '0px')
  expect(
    await target.evaluate(
      (element) => element.getBoundingClientRect().top > window.innerHeight,
    ),
  ).toBe(true)
})

test('adds header elevation after scrolling and removes it at the top', async ({
  page,
}) => {
  await page.goto('/about')
  const header = page.getByRole('banner')
  await expect(header).toHaveCSS('box-shadow', 'none')
  await page.evaluate(() => window.scrollTo(0, 250))
  await expect(header).not.toHaveCSS('box-shadow', 'none')
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(header).toHaveCSS('box-shadow', 'none')
})

test('elevates the header when the browser reports an initially scrolled document', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => 250,
    }),
  )
  await page.goto('/about')
  await expect(page.getByRole('banner')).not.toHaveCSS('box-shadow', 'none')
})

test('offers the real router and query inspectors during development', async ({
  page,
  developerURL,
}) => {
  test.setTimeout(90000)
  await page.goto(developerURL)
  await page.getByRole('button', { name: /Open TanStack Devtools/i }).click()
  await expect(page.getByText('Tanstack Router', { exact: true })).toBeVisible()
  await page.getByText('Tanstack Query', { exact: true }).click()
  await expect(page.getByText('["auth","user"]', { exact: true })).toBeVisible()
})

test('excludes developer controls from the production page', async ({
  page,
}) => {
  await page.goto('/about')
  await expect(
    page.getByRole('button', { name: /Open TanStack Devtools/i }),
  ).toHaveCount(0)
})
