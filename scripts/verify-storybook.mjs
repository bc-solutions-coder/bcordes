import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const app = new URL('../apps/web/', import.meta.url)
const require = createRequire(new URL('package.json', app))
const { preview } = await import(require.resolve('vite'))
const { chromium, expect } = require('@playwright/test')
const server = await preview({
  configFile: false,
  root: fileURLToPath(app),
  build: { outDir: 'storybook-static' },
  preview: { host: '127.0.0.1', port: 0, open: false },
})
let browser
try {
  const baseURL = server.resolvedUrls.local[0]
  assert.ok(baseURL, 'Storybook preview has a local URL')
  const response = await fetch(new URL('index.json', baseURL), {
    signal: AbortSignal.timeout(10_000),
    redirect: 'manual',
  })
  assert.equal(response.status, 200, 'Storybook index returns 200')
  const index = await response.json()
  const story = Object.values(index.entries).find(
    (entry) =>
      entry.type === 'story' &&
      entry.title === 'UI/Button' &&
      entry.name === 'Default',
  )
  assert.ok(
    story && typeof story.id === 'string',
    'Built index contains UI/Button Default',
  )
  browser = await chromium.launch()
  const page = await browser.newPage()
  const frameURL = new URL('iframe.html', baseURL)
  frameURL.searchParams.set('id', story.id)
  frameURL.searchParams.set('viewMode', 'story')
  await page.goto(frameURL.href)
  const button = page.getByRole('button', { name: 'Button', exact: true })
  await expect(button).toBeVisible()
  await expect(button).toBeEnabled()
  await button.click()
  await expect(button).toBeFocused()
  console.log(
    `PASS ${story.title} / ${story.name}: visible, enabled and accepts focus on click`,
  )
} finally {
  try {
    await browser?.close()
  } finally {
    await server.close()
  }
}
