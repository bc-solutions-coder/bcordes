import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { getValkey } from '@bcordes/valkey'
import type { Notification } from '@bcordes/wallow/types'

export default async function setup() {
  let container: string | undefined
  if (!process.env.E2E_VALKEY_URL) {
    container = execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '-d',
        '-p',
        `127.0.0.1:${process.env.E2E_VALKEY_PORT}:6379`,
        'valkey/valkey:8-alpine',
      ],
      { encoding: 'utf8' },
    ).trim()
  }
  const redis = getValkey()
  const states = new Map<string, boolean>()
  const requests: Array<{ path: string; authenticated: boolean }> = []
  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    const token = req.headers.authorization ?? ''
    const origin = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}`
    if (path === '/.well-known/openid-configuration') {
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          issuer: origin,
          token_endpoint: `${origin}/connect/token`,
          authorization_endpoint: `${origin}/connect/authorize`,
          jwks_uri: `${origin}/.well-known/jwks`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['client_secret_post'],
        }),
      )
      return
    }
    if (path === '/connect/token' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          access_token: 'e2e-service-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      )
      return
    }
    if (path === '/connect/authorize') {
      res.setHeader('Content-Type', 'text/html')
      res.end('<h1>Fixture identity provider</h1>')
      return
    }
    if (path === '/__requests') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(requests))
      return
    }
    requests.push({ path, authenticated: token.startsWith('Bearer e2e-') })
    if (!token.startsWith('Bearer e2e-')) {
      res.writeHead(401).end()
      return
    }
    if (path === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write(': connected\n\n')
      return
    }
    if (path.endsWith('/read') || path.endsWith('/read-all'))
      states.set(token, true)
    const isRead = states.get(token) ?? false
    const notification: Notification = {
      id: '00000000-0000-4000-8000-000000000001',
      userId: 'e2e-user',
      type: 'InquirySubmitted',
      title: 'Browser fixture notification',
      message: 'Your controlled inquiry is ready.',
      isRead,
      readAt: isRead ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      actionUrl: null,
    }
    let body: unknown
    if (path === '/v1/identity/users/me') {
      body = {
        id: 'e2e-user',
        firstName: 'Browser',
        lastName: 'User',
        permissions: ['InquiriesWrite'],
        roles: ['user'],
      }
    } else if (req.method === 'POST' && path === '/v1/inquiries') {
      body = {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '',
        projectType: 'Frontend',
        budgetRange: '$5k-$15k',
        timeline: '1-3 months',
        message: 'A browser inquiry',
        status: 'New',
        createdAt: new Date().toISOString(),
      }
    } else if (path === '/v1/notifications/unread-count') {
      body = { count: isRead ? 0 : 1 }
    } else if (path === '/v1/notifications') {
      body = {
        items: [notification],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 20,
      }
    } else if (
      path === '/v1/inquiries/submitted' ||
      path.endsWith('/read') ||
      path === '/v1/notifications/read-all'
    ) {
      body = []
    } else {
      res.writeHead(404).end()
      return
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  })
  try {
    await redis.ping()
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(Number(process.env.E2E_BACKEND_PORT), '127.0.0.1', resolve)
    })
  } catch (error) {
    redis.disconnect()
    if (container) execFileSync('docker', ['rm', '-f', container])
    throw error
  }
  return async () => {
    server.closeAllConnections()
    server.close()
    await redis.quit()
    if (container)
      execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' })
  }
}
