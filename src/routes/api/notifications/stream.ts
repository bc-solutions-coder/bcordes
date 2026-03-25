import { createFileRoute } from '@tanstack/react-router'
import {
  HttpTransportType,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr'
import type { RealtimeEnvelope } from '~/lib/wallow/types'
import type { SessionData } from '~/lib/auth/types'
import { getSession } from '~/lib/auth/session'
import { refreshToken } from '~/lib/auth/oidc'

const WALLOW_API_URL = process.env.WALLOW_API_URL!

function buildHubConnection(accessToken: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${WALLOW_API_URL}/hubs/realtime`, {
      transport: HttpTransportType.WebSockets,
      accessTokenFactory: () => accessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(process.env.NODE_ENV === 'production' ? LogLevel.Warning : LogLevel.Debug)
    .build()
}

export const Route = createFileRoute('/api/notifications/stream')({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSession()
        if (!session?.accessToken) {
          return new Response('Unauthorized', { status: 401 })
        }

        const hub = buildHubConnection(session.accessToken)
        let closed = false

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()

            function send(envelope: RealtimeEnvelope) {
              if (closed) return
              try {
                const data = JSON.stringify(envelope)
                controller.enqueue(
                  encoder.encode(`event: ${envelope.type}\ndata: ${data}\n\n`),
                )
              } catch {
                // Client disconnected
              }
            }

            // Log all hub invocations to discover method names
            if (process.env.NODE_ENV !== 'production') {
              const origOn = hub.on.bind(hub)
              hub.on = (methodName: string, handler: (...args: unknown[]) => void) => {
                return origOn(methodName, (...args: unknown[]) => {
                  console.log(`[sse] hub.on("${methodName}"):`, JSON.stringify(args).slice(0, 300))
                  handler(...args)
                })
              }
            }

            hub.on('ReceiveNotifications', (envelope: RealtimeEnvelope) => {
              send(envelope)
            })

            hub.on('ReceiveNotification', (envelope: RealtimeEnvelope) => {
              send(envelope)
            })

            hub.on('ReceivePresence', (envelope: RealtimeEnvelope) => {
              send(envelope)
            })

            hub.onclose(async () => {
              if (closed) return
              const currentSession = session as SessionData
              if (!currentSession.refreshToken) return

              try {
                const tokens = await refreshToken(currentSession.refreshToken)
                const reconnectedHub = buildHubConnection(tokens.accessToken)
                reconnectedHub.on(
                  'ReceiveNotifications',
                  (envelope: RealtimeEnvelope) => send(envelope),
                )
                reconnectedHub.on(
                  'ReceiveNotification',
                  (envelope: RealtimeEnvelope) => send(envelope),
                )
                reconnectedHub.on(
                  'ReceivePresence',
                  (envelope: RealtimeEnvelope) => send(envelope),
                )
                await reconnectedHub.start()
                console.log('[sse] reconnected to hub')
              } catch {
                if (!closed) controller.close()
              }
            })

            try {
              await hub.start()
              console.log('[sse] hub connected')
              // Send initial keepalive
              controller.enqueue(encoder.encode(': connected\n\n'))
            } catch (err) {
              console.error('[sse] hub connection failed', err)
              controller.close()
            }
          },
          cancel() {
            console.log('[sse] client disconnected, stopping hub')
            closed = true
            hub.stop()
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})
