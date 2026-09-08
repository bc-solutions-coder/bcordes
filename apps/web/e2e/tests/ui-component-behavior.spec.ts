import { test, expect } from '../fixtures/components'
import type { Locator } from '@playwright/test'

async function settle(locator: Locator) {
  await locator.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    )
  })
}
async function appearance(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      color: style.color,
      border: style.borderTopWidth,
      decoration: style.textDecorationLine,
    }
  })
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1000 })
  await page.emulateMedia({ colorScheme: 'light' })
})

test('renders distinct button and badge variants, hover effects and button dimensions', async ({
  page,
  uiComponentsURL,
}) => {
  await page.goto(uiComponentsURL)
  const buttons = page.getByRole('region', { name: 'Button variants' })
  const normal = buttons.getByRole('button', {
    name: 'default button',
    exact: true,
  })
  await expect(normal).toBeVisible()
  const primary = await appearance(normal)
  for (const variant of [
    'destructive',
    'outline',
    'secondary',
    'ghost',
    'link',
  ]) {
    expect(
      await appearance(
        buttons.getByRole('button', { name: `${variant} button`, exact: true }),
      ),
    ).not.toEqual(primary)
  }
  for (const variant of [
    'default',
    'destructive',
    'outline',
    'secondary',
    'ghost',
    'link',
  ]) {
    const button = buttons.getByRole('button', {
      name: `${variant} button`,
      exact: true,
    })
    await page.mouse.move(1190, 990)
    await settle(button)
    const before = await appearance(button)
    await button.hover()
    await settle(button)
    expect(await appearance(button)).not.toEqual(before)
  }
  const sizes = page.getByRole('region', { name: 'Button sizes' })
  const bounds = await Promise.all(
    ['sm', 'default', 'lg', 'icon-sm', 'icon', 'icon-lg'].map(async (size) => {
      const box = await sizes
        .getByRole('button', { name: `${size} size`, exact: true })
        .boundingBox()
      expect(box).not.toBeNull()
      if (!box) throw new Error('Button has no visible bounds')
      return box
    }),
  )
  const [small, normalSize, large, smallIcon, icon, largeIcon] = bounds
  if (!small || !normalSize || !large || !smallIcon || !icon || !largeIcon)
    throw new Error('Button dimensions are missing')
  expect(small.height).toBeLessThan(normalSize.height)
  expect(normalSize.height).toBeLessThan(large.height)
  for (const box of bounds.slice(3))
    expect(box.width).toBeCloseTo(box.height, 1)
  expect(smallIcon.height).toBeLessThan(icon.height)
  expect(icon.height).toBeLessThan(largeIcon.height)
  const badges = page.getByRole('region', { name: 'Badge variants' })
  const badgeStyles = await Promise.all(
    ['default', 'secondary', 'destructive', 'outline'].map((variant) =>
      appearance(badges.getByText(`${variant} badge`, { exact: true })),
    ),
  )
  expect(new Set(badgeStyles.map((style) => JSON.stringify(style))).size).toBe(
    4,
  )
})

test('applies caller border, label color and form popup customizations', async ({
  page,
  uiComponentsURL,
}) => {
  await page.goto(uiComponentsURL)
  const region = page.getByRole('region', { name: 'Caller customization' })
  const pairs = [
    [
      region.getByRole('button', { name: 'Default border' }),
      region.getByRole('button', { name: 'Custom border' }),
    ],
    [
      region.getByText('Default badge border'),
      region.getByText('Custom badge border'),
    ],
    [
      region.getByRole('checkbox', { name: 'Default checkbox border' }),
      region.getByRole('checkbox', { name: 'Custom checkbox border' }),
    ],
    [
      region.getByRole('switch', { name: 'Default switch border' }),
      region.getByRole('switch', { name: 'Custom switch border' }),
    ],
  ] as const
  for (const [normal, custom] of pairs)
    expect(parseFloat((await appearance(custom)).border)).toBeGreaterThan(
      parseFloat((await appearance(normal)).border),
    )
  const labels = page.getByRole('region', { name: 'Label appearance' })
  expect(
    (await appearance(labels.getByText('Custom label color'))).color,
  ).not.toBe((await appearance(labels.getByText('Default label color'))).color)
  const enabled = await labels
    .getByText('Enabled label', { exact: true })
    .evaluate((element) => getComputedStyle(element).opacity)
  const disabled = await labels
    .getByText('Disabled label', { exact: true })
    .evaluate((element) => getComputedStyle(element).opacity)
  expect(Number(disabled)).toBeLessThan(Number(enabled))
  const standard = page.getByRole('combobox', { name: 'Default choice' })
  const custom = page.getByRole('combobox', { name: 'Custom choice' })
  expect(parseFloat((await appearance(custom)).border)).toBeGreaterThan(
    parseFloat((await appearance(standard)).border),
  )
  await standard.click()
  async function popupBorder() {
    return page.getByRole('listbox').evaluate((element) => {
      const borders = []
      for (
        let current: Element | null = element;
        current && current !== document.body;
        current = current.parentElement
      )
        borders.push(parseFloat(getComputedStyle(current).borderTopWidth))
      return Math.max(...borders)
    })
  }
  const normalBorder = await popupBorder()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await custom.click()
  await expect(custom).toHaveAttribute('aria-expanded', 'true')
  await expect.poll(popupBorder).toBeGreaterThan(normalBorder)
})

test('visibly marks checked controls and moves both switch sizes after toggling', async ({
  page,
  uiComponentsURL,
}) => {
  await page.goto(uiComponentsURL)
  const checkboxes = page.getByRole('region', { name: 'Checkbox appearance' })
  await expect(
    checkboxes.getByRole('checkbox', { name: 'Checked choice', exact: true }),
  ).toBeChecked()
  await expect(
    checkboxes.getByRole('checkbox', { name: 'Unchecked choice' }),
  ).not.toBeChecked()
  await expect(checkboxes).toHaveScreenshot('checkbox-states.png')
  async function thumb(control: Locator) {
    return control.evaluate((element) => {
      const circles = Array.from(element.querySelectorAll('*'))
        .map((child) => ({
          box: child.getBoundingClientRect(),
          style: getComputedStyle(child),
        }))
        .filter(
          ({ box, style }) =>
            box.width > 0 &&
            Math.abs(box.width - box.height) < 1 &&
            parseFloat(style.borderRadius) >= box.width / 2 &&
            style.backgroundColor !== 'rgba(0, 0, 0, 0)',
        )
      const circle = circles[0]
      if (!circle) throw new Error('No painted circular thumb')
      return { x: circle.box.x, width: circle.box.width }
    })
  }
  const widths = []
  for (const name of ['Default toggle', 'Small toggle']) {
    const control = page.getByRole('switch', { name })
    const before = await thumb(control)
    await control.click()
    await expect(control).toBeChecked()
    await settle(control)
    const after = await thumb(control)
    expect(after.x - before.x).toBeGreaterThan(5)
    widths.push(after.width)
  }
  const [defaultWidth, smallWidth] = widths
  if (defaultWidth === undefined || smallWidth === undefined)
    throw new Error('Switch dimensions are missing')
  expect(defaultWidth).toBeGreaterThan(smallWidth)
})

test('fills the requested progress fraction and draws oriented customizable separators', async ({
  page,
  uiComponentsURL,
}) => {
  await page.goto(uiComponentsURL)
  const progress = page.getByRole('progressbar', { name: 'Completion' })
  async function fraction() {
    await settle(progress)
    return progress.evaluate((element) => {
      const root = element.getBoundingClientRect()
      const painted = Array.from(element.querySelectorAll('*'))
        .map((child) => ({
          rect: child.getBoundingClientRect(),
          color: getComputedStyle(child).backgroundColor,
        }))
        .filter(
          ({ rect, color }) =>
            rect.width > 0 && rect.height > 0 && color !== 'rgba(0, 0, 0, 0)',
        )
      const track = painted[0]
      const fill = painted.find((part) => part.color !== track?.color)
      if (!track || !fill)
        throw new Error('Progress fill is not visually distinct from track')
      const visibleWidth = Math.max(
        0,
        Math.min(root.right, fill.rect.right) -
          Math.max(root.left, fill.rect.left),
      )
      return visibleWidth / root.width
    })
  }
  expect(await fraction()).toBeCloseTo(0.2, 2)
  await page.getByRole('button', { name: 'Set sixty' }).click()
  expect(await fraction()).toBeCloseTo(0.6, 2)
  await page.getByRole('button', { name: 'Set complete' }).click()
  expect(await fraction()).toBeCloseTo(1, 2)
  const horizontal = page.getByRole('separator', { name: 'Horizontal divider' })
  const vertical = page.getByRole('separator', { name: 'Vertical divider' })
  const h = await horizontal.boundingBox(),
    v = await vertical.boundingBox()
  expect(h && h.width / h.height).toBeGreaterThan(20)
  expect(v && v.height / v.width).toBeGreaterThan(20)
  expect(h?.height).toBeGreaterThan(0)
  expect(v?.width).toBeGreaterThan(0)
  expect((await appearance(horizontal)).background).not.toBe('rgba(0, 0, 0, 0)')
  expect(
    (await appearance(page.getByRole('separator', { name: 'Custom divider' })))
      .background,
  ).not.toBe((await appearance(horizontal)).background)
})

test('loads an avatar image, shows fallback after a real failure and preserves round framing and caller ring', async ({
  page,
  uiComponentsURL,
}) => {
  await page.route('**/avatar-success.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#1268bb"/></svg>',
    }),
  )
  await page.route('**/avatar-failed.svg', (route) =>
    route.fulfill({ status: 503, body: 'Image unavailable' }),
  )
  const failed = page.waitForResponse(
    (response) =>
      response.url().endsWith('/avatar-failed.svg') &&
      response.status() === 503,
  )
  await page.goto(uiComponentsURL)
  await failed
  const section = page.getByRole('region', { name: 'Avatar appearance' })
  const image = section.getByRole('img', { name: 'Loaded portrait' })
  await expect(image).toBeVisible()
  expect(
    await image.evaluate(
      (element) =>
        element instanceof HTMLImageElement &&
        element.complete &&
        element.naturalWidth > 0,
    ),
  ).toBe(true)
  await expect(section.getByText('AB', { exact: true })).toBeVisible()
  await expect(section.getByText('OK', { exact: true })).toHaveCount(0)
  const loaded = page.getByLabel('Successful avatar', { exact: true })
  const fallback = page.getByLabel('Failed avatar', { exact: true })
  const bounds = await loaded.boundingBox(),
    other = await fallback.boundingBox()
  expect(bounds?.width).toBe(bounds?.height)
  expect(bounds?.width).toBe(other?.width)
  expect(
    await loaded.evaluate((element) =>
      parseFloat(getComputedStyle(element).borderRadius),
    ),
  ).toBeGreaterThanOrEqual((bounds?.width ?? 0) / 2)
  expect(
    await loaded.evaluate((element) => getComputedStyle(element).overflow),
  ).toBe('hidden')
  const normalShadow = await loaded.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  )
  expect(
    await page
      .getByLabel('Ring avatar')
      .evaluate((element) => getComputedStyle(element).boxShadow),
  ).not.toBe(normalShadow)
})

for (const side of ['default', 'top', 'right', 'bottom', 'left']) {
  test(`places the ${side} sheet against its requested viewport edge`, async ({
    page,
    uiComponentsURL,
  }) => {
    await page.goto(`${uiComponentsURL}?scene=sheet&side=${side}`)
    await page.getByRole('button', { name: 'Open sheet' }).click()
    const dialog = page.getByRole('dialog', { name: 'Placement' })
    await expect(dialog).toBeVisible()
    await settle(dialog)
    const box = await dialog.boundingBox()
    if (!box) throw new Error('Sheet has no bounds')
    expect(box.width).toBeGreaterThan(0)
    expect(box.height).toBeGreaterThan(0)
    if (side === 'left' || side === 'right' || side === 'default') {
      expect(box.y).toBeCloseTo(0, 0)
      expect(box.height).toBeCloseTo(1000, 0)
      if (side === 'left') {
        expect(box.x).toBeCloseTo(0, 0)
        expect(box.x + box.width).toBeLessThan(1200)
      } else {
        expect(box.x + box.width).toBeCloseTo(1200, 0)
        expect(box.x).toBeGreaterThan(0)
      }
    } else {
      expect(box.x).toBeCloseTo(0, 0)
      expect(box.width).toBeCloseTo(1200, 0)
      if (side === 'top') {
        expect(box.y).toBeCloseTo(0, 0)
        expect(box.height).toBeLessThan(1000)
      } else {
        expect(box.y + box.height).toBeCloseTo(1000, 0)
        expect(box.y).toBeGreaterThan(0)
      }
    }
  })
}

test('moves the visible active distinction between mobile navigation destinations', async ({
  page,
  uiComponentsURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${uiComponentsURL}?scene=navigation&mobile=true`)
  const dialog = page.getByRole('dialog', { name: 'Navigation' })
  const projects = dialog.getByRole('link', { name: 'Projects' }),
    about = dialog.getByRole('link', { name: 'About' })
  await expect(projects).toHaveAttribute('aria-current', 'page')
  const active = await appearance(projects),
    inactive = await appearance(about)
  expect(active).not.toEqual(inactive)
  await about.click()
  await page.mouse.move(0, 0)
  await settle(dialog)
  await expect(about).toHaveAttribute('aria-current', 'page')
  expect(await appearance(about)).toEqual(active)
  expect(await appearance(projects)).toEqual(inactive)
})
