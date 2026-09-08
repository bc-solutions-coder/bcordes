import { test, expect } from '../fixtures/components'

for (const { group, all, choice } of [
  { group: 'technology', all: 'All', choice: 'React' },
  { group: 'year', all: 'All Years', choice: '2024' },
]) {
  test(`distinguishes the selected ${group} and restores the All appearance on reset`, async ({
    page,
    projectFilterURL,
  }) => {
    await page.goto(projectFilterURL)
    const reset = page.getByRole('button', { name: all, exact: true })
    const option = page.getByRole('button', { name: choice, exact: true })
    const resetLabel = reset.getByText(all, { exact: true })
    const optionLabel = option.getByText(choice, { exact: true })
    await expect(resetLabel).toBeVisible()
    await expect(optionLabel).toBeVisible()
    const selected = await resetLabel.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    )
    const unselected = await optionLabel.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    )
    expect(selected).not.toBe(unselected)
    await option.click()
    await expect(optionLabel).toHaveCSS('background-color', selected)
    await expect(resetLabel).toHaveCSS('background-color', unselected)
    await reset.click()
    await expect(resetLabel).toHaveCSS('background-color', selected)
    await expect(optionLabel).toHaveCSS('background-color', unselected)
  })
}
