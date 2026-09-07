import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import { test as base } from '@playwright/test'
import { startBackend } from './backend'

export { expect } from '@playwright/test'

async function availablePort() {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Application did not receive a TCP port')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  return address.port
}

export const test = base.extend<{
  guestBackend: Awaited<ReturnType<typeof startBackend>> & { owner: string }
}>({
  guestBackend: async ({}, use, testInfo) => {
    const owner = randomUUID()
    const backend = await startBackend(0, owner)
    try {
      await use({ ...backend, owner })
    } finally {
      await testInfo.attach('backend-observations', {
        body: JSON.stringify(backend.requests(owner)),
        contentType: 'application/json',
      })
      await backend.close()
    }
  },
  baseURL: async ({ guestBackend }, use) => {
    const port = await availablePort()
    const url = `http://localhost:${port}`
    const app = spawn(process.execPath, ['.output/server/index.mjs'], {
      env: {
        ...process.env,
        PORT: String(port),
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
        BFF_API_BASE_URL: guestBackend.origin,
        OIDC_ISSUER: guestBackend.origin,
        OIDC_REDIRECT_URI: `${url}/bff/callback`,
        OIDC_POST_LOGOUT_REDIRECT_URI: `${url}/`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    app.stdout.on('data', (chunk) => {
      output += String(chunk)
    })
    app.stderr.on('data', (chunk) => {
      output += String(chunk)
    })
    try {
      const deadline = Date.now() + 30_000
      while (true) {
        if (app.exitCode !== null)
          throw new Error(`Application exited: ${output}`)
        try {
          if ((await fetch(url)).ok) break
        } catch {
          /* The process has not opened its socket yet. */
        }
        if (Date.now() > deadline)
          throw new Error(`Application did not start: ${output}`)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      await use(url)
    } finally {
      if (app.exitCode === null) {
        const exited = new Promise<void>((resolve) =>
          app.once('exit', () => resolve()),
        )
        app.kill('SIGTERM')
        const force = setTimeout(() => app.kill('SIGKILL'), 1_000)
        try {
          await exited
        } finally {
          clearTimeout(force)
        }
      }
    }
  },
})
