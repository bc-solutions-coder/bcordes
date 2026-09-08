import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import {
  chmod,
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const production = join(root, 'scripts/verify-production.mjs')
const docker = join(root, 'scripts/verify-docker.sh')
const headings = {
  '/': 'Professional<br>Software <span>Engineering</span>',
  '/about': 'Bryan Cordes',
  '/projects': 'Projects',
  '/contact': 'Get in Touch',
}

async function endpoint(t, override = () => false) {
  const server = createServer((request, response) => {
    if (override(request, response)) return
    if (request.url === '/api/health') {
      response.end('ready')
      return
    }
    const heading = headings[request.url]
    if (heading) {
      response.setHeader('content-type', 'text/html')
      response.end(
        `<html><head><link href="/assets/app.css" rel="stylesheet"><script src="/assets/app.js"></script></head><body><h1>${heading}</h1></body></html>`,
      )
    } else if (request.url === '/assets/app.css') {
      response.setHeader('content-type', 'text/css')
      response.end('body { color: black }')
    } else if (request.url === '/assets/app.js') {
      response.setHeader('content-type', 'text/javascript')
      response.end('console.log("ready")')
    } else {
      response.statusCode = 404
      response.end('missing')
    }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })
  return `http://127.0.0.1:${address.port}`
}

async function command(
  executable,
  args,
  { cwd = root, env = {}, timeout = 5000 } = {},
) {
  const child = spawn(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = '',
    timedOut = false
  child.stdout.on('data', (data) => {
    output += data
  })
  child.stderr.on('data', (data) => {
    output += data
  })
  const timer = setTimeout(() => {
    timedOut = true
    process.kill(-child.pid, 'SIGKILL')
  }, timeout)
  try {
    const [code] = await once(child, 'close')
    return { code, output, timedOut }
  } finally {
    clearTimeout(timer)
  }
}

async function temporary(t) {
  const dir = await mkdtemp(join(tmpdir(), 'bcordes-verifier-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return dir
}

for (const wrapper of [false, true]) {
  test(`accepts distinct served pages and direct nonempty assets through ${wrapper ? 'the shell wrapper from another directory' : 'the Node CLI'}`, async (t) => {
    const url = await endpoint(t)
    const result = wrapper
      ? await command(
          'bash',
          [join(root, 'scripts/verify-production.sh'), url],
          { cwd: tmpdir() },
        )
      : await command(process.execPath, [production, url])
    assert.equal(result.code, 0, result.output)
    assert.match(result.output, /GET \/contact: 200 HTML/)
    assert.match(result.output, /GET js asset: 200/)
    assert.equal(
      (await fetch(url)).status,
      200,
      'externally owned endpoint remains running',
    )
  })
}

for (const { failure, target, mode, extension } of [
  {
    failure: 'generic pages',
    target: 'pages',
    mode: 'identity',
    extension: '',
  },
  {
    failure: 'wrong about heading',
    target: 'about',
    mode: 'identity',
    extension: '',
  },
  { failure: 'page redirect', target: 'page', mode: 'redirect', extension: '' },
  { failure: 'page MIME', target: 'page', mode: 'mime', extension: '' },
  { failure: 'page error', target: 'page', mode: 'error', extension: '' },
  {
    failure: 'missing CSS reference',
    target: 'reference',
    mode: 'missing',
    extension: 'css',
  },
  {
    failure: 'missing JS reference',
    target: 'reference',
    mode: 'missing',
    extension: 'js',
  },
  {
    failure: 'CSS redirect',
    target: 'asset',
    mode: 'redirect',
    extension: 'css',
  },
  {
    failure: 'JS redirect',
    target: 'asset',
    mode: 'redirect',
    extension: 'js',
  },
  { failure: 'CSS MIME', target: 'asset', mode: 'mime', extension: 'css' },
  { failure: 'JS MIME', target: 'asset', mode: 'mime', extension: 'js' },
  { failure: 'CSS error', target: 'asset', mode: 'error', extension: 'css' },
  { failure: 'JS error', target: 'asset', mode: 'error', extension: 'js' },
  { failure: 'empty CSS', target: 'asset', mode: 'empty', extension: 'css' },
  { failure: 'empty JS', target: 'asset', mode: 'empty', extension: 'js' },
]) {
  test(`rejects ${failure} from the supplied endpoint`, async (t) => {
    const url = await endpoint(t, (request, response) => {
      const path = request.url
      if (target === 'pages' && headings[path]) {
        response.setHeader('content-type', 'text/html')
        response.end(
          '<html><head><link href="/assets/app.css"><script src="/assets/app.js"></script></head><body><h1>Unrelated page</h1></body></html>',
        )
        return true
      }
      if (target === 'about' && path === '/about') {
        response.setHeader('content-type', 'text/html')
        response.end('<html><h1>Projects</h1><p>Bryan Cordes</p></html>')
        return true
      }
      if (target === 'page' && path === '/contact') {
        if (mode === 'redirect') {
          response.writeHead(302, { location: '/' })
          response.end()
        } else if (mode === 'mime') {
          response.setHeader('content-type', 'application/json')
          response.end('<html><h1>Get in Touch</h1></html>')
        } else {
          response.statusCode = 503
          response.end('Unavailable')
        }
        return true
      }
      if (target === 'reference' && path === '/') {
        const retainedExtension = extension === 'css' ? 'js' : 'css'
        response.setHeader('content-type', 'text/html')
        response.end(
          `<html><h1>${headings['/']}</h1><link href="/assets/app.${retainedExtension}"></html>`,
        )
        return true
      }
      if (target === 'asset' && path === `/assets/app.${extension}`) {
        if (mode === 'error') {
          response.statusCode = 503
          response.setHeader(
            'content-type',
            extension === 'css' ? 'text/css' : 'text/javascript',
          )
          response.end('unavailable asset')
          return true
        }
        if (mode === 'redirect') {
          response.writeHead(302, { location: `/replacement.${extension}` })
          response.end()
          return true
        }
        if (mode === 'mime') {
          response.setHeader('content-type', 'text/plain')
          response.end('wrong kind')
          return true
        }
        if (mode === 'empty') {
          response.setHeader(
            'content-type',
            extension === 'css' ? 'text/css' : 'text/javascript',
          )
          response.end()
          return true
        }
      }
      if (path === `/replacement.${extension}`) {
        response.setHeader(
          'content-type',
          extension === 'css' ? 'text/css' : 'text/javascript',
        )
        response.end('replacement')
        return true
      }
      return false
    })
    const result = await command(process.execPath, [production, url])
    assert.equal(result.timedOut, false, result.output)
    assert.notEqual(
      result.code,
      0,
      `${failure} unexpectedly passed: ${result.output}`,
    )
  })
}

test('reports a missing production artifact and exits without waiting for startup timeout', async (t) => {
  const dir = await temporary(t)
  await mkdir(join(dir, 'scripts'))
  await copyFile(production, join(dir, 'scripts/verify-production.mjs'))
  const result = await command(process.execPath, [
    join(dir, 'scripts/verify-production.mjs'),
  ])
  assert.equal(result.timedOut, false)
  assert.equal(result.code, 1)
  assert.match(result.output, /Production server exited|Cannot find module/)
})

async function dockerBoundary(t, url) {
  const dir = await temporary(t),
    log = join(dir, 'calls.jsonl'),
    executable = join(dir, 'docker')
  await writeFile(
    executable,
    `#!${process.execPath}\nimport { appendFileSync } from 'node:fs';\nconst args = process.argv.slice(2); appendFileSync(process.env.VERIFIER_CALLS, JSON.stringify(args)+'\\n');\nif (args[0] === 'image') console.log('sha256:controlled-image');\nif (args[0] === 'port') console.log('127.0.0.1:'+new URL(process.env.VERIFIER_ENDPOINT).port);\nif (args[0] === 'logs') console.error('controlled container diagnostics');\n`,
  )
  await chmod(executable, 0o755)
  return {
    env: {
      PATH: `${dir}:${process.env.PATH}`,
      VERIFIER_CALLS: log,
      VERIFIER_ENDPOINT: url,
      VERIFY_READINESS_TIMEOUT_MS: '400',
      NODE_AUTH_TOKEN: '',
    },
    calls: async () =>
      (await readFile(log, 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
  }
}

test('rejects invalid Docker CLI arguments before creating resources', async () => {
  const result = await command('bash', [docker, '--unknown'])
  assert.equal(result.code, 2)
  assert.match(result.output, /Usage:/)
})

test('reuses one image for both OIDC URL configurations without a build token and cleans its resources', async (t) => {
  const url = await endpoint(t),
    boundary = await dockerBoundary(t, url)
  const result = await command('bash', [docker, '--image', 'controlled-tag'], {
    env: boundary.env,
    timeout: 8000,
  })
  assert.equal(result.code, 0, result.output)
  const calls = await boundary.calls()
  assert.equal(
    calls.some((args) => args[0] === 'build'),
    false,
  )
  const runs = calls.filter(
    (args) => args[0] === 'run' && args.includes('BFF_APP_ID=bcordes-smoke'),
  )
  assert.equal(runs.length, 2)
  assert.equal(runs[0].at(-1), runs[1].at(-1))
  assert.equal(runs[0].at(-1), 'sha256:controlled-image')
  for (const [index, domain] of [
    'bcordes.example',
    'alternate.example',
  ].entries()) {
    assert.ok(
      runs[index].includes(`OIDC_REDIRECT_URI=https://${domain}/bff/callback`),
    )
    assert.ok(
      runs[index].includes(`OIDC_POST_LOGOUT_REDIRECT_URI=https://${domain}/`),
    )
  }
  assert.ok(calls.some((args) => args[0] === 'rm' && args.includes('-f')))
  assert.ok(calls.some((args) => args[0] === 'network' && args[1] === 'rm'))
})

for (const health of ['redirect', 'missing', 'stalled']) {
  test(`rejects ${health} readiness within its deadline and reports diagnostics before cleanup`, async (t) => {
    const url = await endpoint(t, (request, response) => {
      if (request.url !== '/api/health') return false
      if (health === 'redirect') {
        response.writeHead(302, { location: '/' })
        response.end()
      } else if (health === 'missing') {
        response.statusCode = 404
        response.end('missing')
      }
      return true
    })
    const boundary = await dockerBoundary(t, url),
      start = performance.now()
    const result = await command(
      'bash',
      [docker, '--image', 'controlled-tag'],
      { env: boundary.env, timeout: 3000 },
    )
    assert.equal(
      result.timedOut,
      false,
      'readiness must enforce its own deadline',
    )
    assert.equal(result.code, 1, result.output)
    assert.ok(performance.now() - start < 2500)
    assert.match(result.output, /did not become ready/)
    assert.match(result.output, /controlled container diagnostics/)
    const calls = await boundary.calls()
    assert.ok(calls.some((args) => args[0] === 'rm' && args.includes('-f')))
    assert.ok(calls.some((args) => args[0] === 'network' && args[1] === 'rm'))
    assert.equal(
      calls.filter(
        (args) =>
          args[0] === 'run' && args.includes('BFF_APP_ID=bcordes-smoke'),
      ).length,
      1,
    )
  })
}

test('times out an individual stalled health request and retries before the overall deadline', async (t) => {
  let attempts = 0
  const url = await endpoint(t, (request, response) => {
    if (request.url !== '/api/health') return false
    attempts += 1
    if (attempts > 1) response.end('ready')
    return true
  })
  const boundary = await dockerBoundary(t, url)
  const result = await command('bash', [docker, '--image', 'controlled-tag'], {
    env: { ...boundary.env, VERIFY_READINESS_TIMEOUT_MS: '5000' },
    timeout: 8000,
  })
  assert.equal(result.timedOut, false)
  assert.equal(result.code, 0, result.output)
  assert.ok(
    attempts >= 3,
    'first configuration retries and second configuration checks health',
  )
})

for (const failure of [false, true]) {
  test(`stops its owned server after ${failure ? 'a page verification failure with diagnostics' : 'successful verification'}`, async (t) => {
    const dir = await temporary(t)
    await mkdir(join(dir, 'scripts'))
    await mkdir(join(dir, 'apps/web/.output/server'), { recursive: true })
    await copyFile(production, join(dir, 'scripts/verify-production.mjs'))
    const marker = join(dir, 'server-stopped'),
      pid = join(dir, 'server-pid')
    await writeFile(
      join(dir, 'apps/web/.output/server/index.mjs'),
      `import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
writeFileSync(process.env.VERIFIER_PID_FILE, String(process.pid));
process.on('exit', () => writeFileSync(process.env.VERIFIER_STOP_FILE, 'stopped'));
const headings = ${JSON.stringify(headings)};
const server = createServer((req, res) => {
 if (headings[req.url]) { res.setHeader('content-type','text/html'); res.end('<html><h1>'+(${failure} ? 'Wrong page' : headings[req.url])+'</h1><link href="/assets/app.css"><script src="/assets/app.js"></script></html>'); }
 else { res.setHeader('content-type', req.url.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end('content'); }
});
server.listen(Number(process.env.PORT), '127.0.0.1', () => console.log('Listening on: http://127.0.0.1:'+server.address().port));
process.on('SIGTERM', () => { server.closeAllConnections(); server.close(); });
`,
    )
    const result = await command(
      process.execPath,
      [join(dir, 'scripts/verify-production.mjs')],
      { env: { VERIFIER_PID_FILE: pid, VERIFIER_STOP_FILE: marker } },
    )
    assert.equal(result.timedOut, false)
    assert.equal(result.code, failure ? 1 : 0, result.output)
    assert.equal(await readFile(marker, 'utf8'), 'stopped')
    const ownedPid = Number.parseInt(await readFile(pid, 'utf8'), 10)
    assert.throws(() => process.kill(ownedPid, 0), { code: 'ESRCH' })
    if (failure) {
      assert.match(result.output, /expected heading/)
      assert.match(result.output, /Listening on:/)
    }
  })
}

test('cleans Docker resources when public smoke fails after successful readiness', async (t) => {
  const url = await endpoint(t, (request, response) => {
    if (request.url !== '/about') return false
    response.setHeader('content-type', 'text/html')
    response.end('<html><h1>Wrong destination</h1></html>')
    return true
  })
  const boundary = await dockerBoundary(t, url)
  const result = await command('bash', [docker, '--image', 'controlled-tag'], {
    env: boundary.env,
  })
  assert.equal(result.code, 1)
  assert.match(result.output, /expected heading/)
  const calls = await boundary.calls()
  assert.ok(calls.some((args) => args[0] === 'rm' && args.includes('-f')))
  assert.ok(calls.some((args) => args[0] === 'network' && args[1] === 'rm'))
})
