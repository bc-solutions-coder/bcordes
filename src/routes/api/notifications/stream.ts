import { createFileRoute } from '@tanstack/react-router'
import {
  HttpTransportType,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr'
import type { HubConnection } from '@microsoft/signalr'
import type { RealtimeEnvelope } from '~/lib/wallow/types'
import { getSession } from '~/lib/auth/session'
import { refreshToken } from '~/lib/auth/oidc'

const WALLOW_API_URL = process.env.WALLOW_API_URL!

const HUB_EVENTS = [
  'ReceiveNotifications',
  'ReceiveNotification',
  'ReceivePresence',
] as const

function buildHubConnection(accessToken: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${WALLOW_API_URL}/hubs/realtime`, {
      transport: HttpTransportType.WebSockets,
      accessTokenFactory: () => accessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(
      process.env.NODE_ENV === 'production'
        ? LogLevel.Warning
        : LogLevel.Debug,
    )
    .build()
}

function registerHubHandlers(
  hub: HubConnection,
  handler: (envelope: RealtimeEnvelope) => void,
): void {
  for (const event of HUB_EVENTS) {
    hub.on(event, handler)
  }
}

function wrapWithDevLogging(hub: HubConnection): void {
  if (process.env.NODE_ENV === 'production') return
  const origOn = hub.on.bind(hub)
  hub.on = (
    methodName: string,
    handler: (...args: Array<unknown>) => void,
  ) => {
    return origOn(methodName, (...args: Array<unknown>) => {
      console.log(
        `[sse] hub.on("${methodName}"):`,
        JSON.stringify(args).slice(0, 300),
      )
      handler(...args)
    })
  }
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
                  encoder.encode(
                    `event: ${envelope.type}\ndata: ${data}\n\n`,
                  ),
                )
              } catch {
                // Client disconnected
              }
            }

            wrapWithDevLogging(hub)
            registerHubHandlers(hub, send)

            hub.onclose(async () => {
              if (closed) return
              if (!session.refreshToken) return

              try {
                const tokens = await refreshToken(
                  session.refreshToken,
                )
                const reconnectedHub = buildHubConnection(
                  tokens.accessToken,
                )
                registerHubHandlers(reconnectedHub, send)
                await reconnectedHub.start()
                console.log('[sse] reconnected to hub')
              } catch {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- closed is mutated in cancel()
                if (!closed) controller.close()
              }
            })

            try {
              await hub.start()
              console.log('[sse] hub connected')
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
