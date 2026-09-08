import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'

const digest = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex')

test('downloads the current resume even when the previous download URL is cached', async ({
  page,
  baseURL,
}) => {
  const currentPdf = await readFile(
    new URL('../../src/routes/-assets/Cordes-Resume.pdf', import.meta.url),
  )
  if (!baseURL) throw new Error('Production base URL is required')
  const cache = createServer(async (request, response) => {
    if (request.url === '/Cordes-Resume.pdf') {
      response.writeHead(200, { 'content-type': 'application/pdf' })
      response.end('%PDF-1.4\nPreviously cached resume')
      return
    }
    try {
      const upstream = await fetch(new URL(request.url ?? '/', baseURL), {
        redirect: 'manual',
      })
      response.writeHead(upstream.status, {
        'content-type':
          upstream.headers.get('content-type') ?? 'application/octet-stream',
      })
      response.end(Buffer.from(await upstream.arrayBuffer()))
    } catch {
      response.writeHead(502)
      response.end('Production server unavailable')
    }
  })
  await new Promise<void>((resolve) => cache.listen(0, '127.0.0.1', resolve))
  try {
    const address = cache.address()
    if (!address || typeof address === 'string')
      throw new Error('Cache server has no port')
    await page.goto(`http://127.0.0.1:${address.port}/resume`)
    const downloaded = page.waitForEvent('download')
    await page.getByRole('link', { name: 'Download PDF' }).click()
    const download = await downloaded
    expect(download.suggestedFilename()).toBe('Cordes-Resume.pdf')
    const path = await download.path()
    if (!path) throw new Error('Resume download did not produce a file')
    expect(digest(await readFile(path))).toBe(digest(currentPdf))
  } finally {
    cache.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      cache.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
