import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../', import.meta.url))
let server
let output = ''

async function startServer() {
  const reservation = createServer()
  reservation.listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const address = reservation.address()
  assert.ok(address && typeof address !== 'string')
  const port = String(address.port)
  await new Promise((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve())),
  )
  server = spawn(process.execPath, ['apps/web/.output/server/index.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: port,
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: port,
      SESSION_SECRET: randomBytes(32).toString('hex'),
      WALLOW_API_URL: 'http://127.0.0.1:1',
      VALKEY_URL: 'redis://127.0.0.1:1',
      OIDC_ISSUER: 'http://127.0.0.1:1',
      OIDC_CLIENT_ID: 'smoke-check',
      OIDC_CLIENT_SECRET: 'smoke-check',
      OIDC_REDIRECT_URI: 'http://127.0.0.1/auth/callback',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stderr.on('data', (data) => {
    output += data
  })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new Error('Production server did not start within 30 seconds')),
      30_000,
    )
    const finish = (callback, value) => {
      clearTimeout(timer)
      callback(value)
    }
    server.once('error', (error) => finish(reject, error))
    server.once('exit', (code) =>
      finish(reject, new Error(`Production server exited with ${code}`)),
    )
    server.stdout.on('data', (data) => {
      output += data
      const address = output.match(
        /Listening on (http:\/\/127\.0\.0\.1:\d+)/,
      )?.[1]
      if (address) finish(resolve, address)
    })
  })
}

async function verify(baseURL) {
  let home = ''
  for (const path of ['/', '/about', '/projects', '/contact']) {
    const response = await fetch(new URL(path, baseURL), {
      signal: AbortSignal.timeout(15_000),
      redirect: 'manual',
    })
    assert.equal(response.status, 200, `${path} HTTP status`)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
    const html = await response.text()
    assert.match(html, /<html/)
    if (path === '/') home = html
    console.log(`GET ${path}: 200 HTML`)
  }
  const assets = [...home.matchAll(/(?:src|href)="([^" ]+)"/g)].map(
    (match) => match[1],
  )
  for (const [extension, contentType] of [
    ['css', /text\/css/],
    ['js', /javascript/],
  ]) {
    const path = assets.find(
      (asset) =>
        asset.startsWith('/assets/') &&
        asset.split('?')[0].endsWith(`.${extension}`),
    )
    assert.ok(path, `Home page references a ${extension} asset`)
    const response = await fetch(new URL(path, baseURL), {
      signal: AbortSignal.timeout(15_000),
    })
    assert.equal(response.status, 200, `${path} HTTP status`)
    assert.match(response.headers.get('content-type') ?? '', contentType)
    assert.ok((await response.arrayBuffer()).byteLength > 0)
    console.log(`GET ${extension} asset: 200`)
  }
}

try {
  const baseURL = process.argv[2] ?? (await startServer())
  await verify(baseURL)
} catch (error) {
  console.error(error.message)
  if (output) console.error(output)
  process.exitCode = 1
} finally {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit')
    server.kill('SIGTERM')
    const killTimer = setTimeout(() => server.kill('SIGKILL'), 5_000)
    await exited
    clearTimeout(killTimer)
  }
}
