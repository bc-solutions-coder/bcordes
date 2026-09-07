import { createServer } from 'node:http'
import { z } from 'zod'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Notification } from '@bcordes/wallow/types'

const inquiryInput = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    phone: z.string().optional(),
    company: z.string().nullable().optional(),
    projectType: z.enum(['Frontend', 'Full-Stack', 'Consulting', 'Other']),
    budgetRange: z.enum(['Under $5k', '$5k-$15k', '$15k-$50k', '$50k+']),
    timeline: z.enum([
      'Less than 1 month',
      '1-3 months',
      '3-6 months',
      '6+ months',
    ]),
    message: z.string().min(10),
  })
  .strict()

export interface BackendObservation {
  method: string
  path: string
  owner: string
  credential: 'user' | 'service'
  body?: unknown
}

const responseControl = z.object({
  method: z.string(),
  path: z.string(),
  status: z.number().int().optional(),
  pending: z.boolean().optional(),
  body: z.unknown().optional(),
})
interface SessionState {
  token: string
  credential: 'user' | 'service'
  isRead: boolean
  requests: Array<BackendObservation>
  control?: z.infer<typeof responseControl>
  releases: Set<() => void>
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  let text = ''
  for await (const chunk of request) text += String(chunk)
  return text ? JSON.parse(text) : undefined
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

export async function startBackend(port = 0, serviceOwner = 'service') {
  const sessions = new Map<string, SessionState>()
  sessions.set(serviceOwner, {
    token: 'e2e-service-token',
    credential: 'service',
    isRead: false,
    requests: [],
    releases: new Set(),
  })
  const failures: Array<unknown> = []
  let origin = ''
  async function handle(req: IncomingMessage, res: ServerResponse) {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    if (path === '/.well-known/openid-configuration') {
      send(res, 200, {
        issuer: origin,
        token_endpoint: `${origin}/connect/token`,
        authorization_endpoint: `${origin}/connect/authorize`,
        jwks_uri: `${origin}/.well-known/jwks`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
      })
      return
    }
    if (path === '/connect/token' && req.method === 'POST') {
      send(res, 200, {
        access_token: 'e2e-service-token',
        token_type: 'Bearer',
        expires_in: 3600,
      })
      return
    }
    if (path === '/connect/authorize') {
      res
        .writeHead(200, { 'Content-Type': 'text/html' })
        .end('<h1>Fixture identity provider</h1>')
      return
    }
    const control = /^\/__sessions\/([^/]+)(?:\/(requests|control))?$/.exec(
      path,
    )
    if (control) {
      const [, owner, operation] = control
      if (!operation && req.method === 'POST') {
        const input = z.object({ token: z.string() }).parse(await readBody(req))
        sessions.set(owner, {
          token: input.token,
          credential: 'user',
          isRead: false,
          requests: [],
          releases: new Set(),
        })
        send(res, 201, {})
        return
      }
      const state = sessions.get(owner)
      if (!state) {
        send(res, 404, {})
        return
      }
      if (operation === 'requests') {
        send(res, 200, state.requests)
        return
      }
      if (operation === 'control' && req.method === 'POST') {
        state.control = responseControl.parse(await readBody(req))
        send(res, 200, {})
        return
      }
      if (operation === 'control' && req.method === 'DELETE') {
        state.releases.forEach((release) => release())
        state.releases.clear()
        state.control = undefined
        send(res, 200, {})
        return
      }
      if (req.method === 'DELETE') {
        state.releases.forEach((release) => release())
        sessions.delete(owner)
        send(res, 200, {})
        return
      }
    }
    const token = req.headers.authorization?.replace(/^Bearer /, '')
    const entry = [...sessions].find(([, state]) => state.token === token)
    if (!entry) {
      send(res, 401, {})
      return
    }
    const [owner, state] = entry
    const method = req.method ?? 'GET'
    const body = await readBody(req)
    state.requests.push({
      method,
      path,
      owner,
      credential: state.credential,
      ...(body === undefined ? {} : { body }),
    })
    const selected = state.control
    if (selected?.method === method && selected.path === path) {
      if (selected.pending)
        await new Promise<void>((resolve) => {
          state.releases.add(resolve)
        })
      if (selected.status) {
        send(
          res,
          selected.status,
          selected.body ?? { message: 'Controlled backend response' },
        )
        return
      }
    }
    if (path === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write(': connected\n\n')
      return
    }
    if (
      method === 'POST' &&
      (path.endsWith('/read') || path.endsWith('/read-all'))
    )
      state.isRead = true
    const notification: Notification = {
      id: '00000000-0000-4000-8000-000000000001',
      userId: 'e2e-user',
      type: 'InquirySubmitted',
      title: 'Browser fixture notification',
      message: 'Your controlled inquiry is ready.',
      isRead: state.isRead,
      readAt: state.isRead ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      actionUrl: null,
    }
    if (path === '/v1/identity/users/me')
      send(res, 200, {
        id: 'e2e-user',
        firstName: 'Browser',
        lastName: 'User',
        permissions: ['InquiriesWrite'],
        roles: ['user'],
      })
    else if (method === 'POST' && path === '/v1/inquiries') {
      const parsed = inquiryInput.safeParse(body)
      if (!parsed.success) {
        send(res, 422, { message: 'Invalid inquiry input' })
        return
      }
      send(res, 200, {
        ...parsed.data,
        id: '00000000-0000-4000-8000-000000000002',
        status: 'New',
        createdAt: new Date().toISOString(),
      })
    } else if (path === '/v1/notifications/unread-count')
      send(res, 200, { count: state.isRead ? 0 : 1 })
    else if (path === '/v1/notifications')
      send(res, 200, {
        items: [notification],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 20,
      })
    else if (
      path === '/v1/inquiries/submitted' ||
      path.endsWith('/read') ||
      path === '/v1/notifications/read-all'
    )
      send(res, 200, [])
    else send(res, 404, {})
  }
  const server = createServer((req, res) => {
    void handle(req, res).catch((error: unknown) => {
      failures.push(error)
      send(res, 500, { message: 'Fixture failure' })
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Backend did not receive a TCP port')
  origin = `http://127.0.0.1:${address.port}`
  return {
    origin,
    requests: (owner: string) => sessions.get(owner)?.requests ?? [],
    close: async () => {
      for (const state of sessions.values())
        state.releases.forEach((release) => release())
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
      if (failures.length)
        throw new AggregateError(failures, 'Fixture backend failed')
    },
  }
}
