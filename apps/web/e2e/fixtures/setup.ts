import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { getValkey, keys } from '@bcordes/valkey'
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
    }
    let body: unknown
    if (req.method === 'POST' && path === '/v1/inquiries') {
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
    await redis.set(
      keys.serviceToken(),
      JSON.stringify({
        accessToken: 'e2e-service-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }),
      'EX',
      3600,
    )
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
    await redis.del(keys.serviceToken())
    await redis.quit()
    if (container)
      execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' })
  }
}
