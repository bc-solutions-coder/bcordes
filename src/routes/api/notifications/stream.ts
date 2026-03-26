import { createFileRoute } from '@tanstack/react-router'
import type { RealtimeEnvelope } from '@/lib/wallow/types'
import { getSession } from '@/lib/auth/session'
import { refreshToken } from '@/lib/auth/oidc'
import { WALLOW_BASE_URL } from '@/lib/wallow/config'
import logger from '@/lib/logger'

const log = logger.child({ module: 'sse' })

const KEEPALIVE_INTERVAL_MS = 30_000
const MAX_STREAM_DURATION_MS = 4 * 60 * 60 * 1_000 // 4 hours

/** Manages open SSE connections and supports graceful SIGTERM drain. */
export class SseManager {
  readonly connections = new Set<ReadableStreamDefaultController<Uint8Array>>()
  private _draining = false

  get draining(): boolean {
    return this._draining
  }

  register(controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.connections.add(controller)
  }

  unregister(controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.connections.delete(controller)
  }

  drain(): void {
    this._draining = true
    const encoder = new TextEncoder()
    const msg = encoder.encode(
      `event: reconnect\ndata: ${JSON.stringify({ reason: 'shutdown' })}\n\n`,
    )
    for (const controller of this.connections) {
      try {
        controller.enqueue(msg)
        controller.close()
      } catch {
        // already closed
      }
    }
    this.connections.clear()
  }
}

export const sseManager = new SseManager()

/** Install the SIGTERM drain handler. Call once at startup. */
export function installSigtermHandler(): void {
  process.once('SIGTERM', () => {
    sseManager.drain()
  })
}

export { MAX_STREAM_DURATION_MS }

export const Route = createFileRoute('/api/notifications/stream')({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSession()
        if (!session?.accessToken) {
          return new Response('Unauthorized', { status: 401 })
        }

        const reqLog = log.child({
          user: session.user.name || session.user.email,
        })

        if (sseManager.draining) {
          return new Response('Service Unavailable', { status: 503 })
        }

        let closed = false
        let keepaliveTimer: ReturnType<typeof setInterval> | undefined
        let maxDurationTimer: ReturnType<typeof setTimeout> | undefined
        let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | null =
          null
        let streamController: ReadableStreamDefaultController<Uint8Array>
        const encoder = new TextEncoder()

        // Message queue + pull resolver for backpressure-aware delivery.
        // Only the most recent keepalive is retained (coalesced) so that
        // high-priority events (reconnect, upstream data) are not buried
        // behind hundreds of unread keepalives.
        let pullResolve: (() => void) | null = null
        let latestKeepalive: Uint8Array | null = null
        let shouldClose = false

        function enqueueOrBuffer(
          controller: ReadableStreamDefaultController<Uint8Array>,
          chunk: Uint8Array,
          isKeepalive = false,
        ) {
          if (closed) return
          if (isKeepalive) {
            // Coalesce: only keep the latest keepalive
            latestKeepalive = chunk
          } else {
            // Non-keepalive: enqueue directly (upstream data, connected, reconnect)
            try {
              controller.enqueue(chunk)
            } catch {
              // Client disconnected
            }
          }
          if (pullResolve) {
            const resolve = pullResolve
            pullResolve = null
            resolve()
          }
        }

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            streamController = controller
            sseManager.register(controller)

            function send(envelope: RealtimeEnvelope) {
              if (closed) return
              const data = JSON.stringify(envelope)
              enqueueOrBuffer(
                controller,
                encoder.encode(`event: ${envelope.type}\ndata: ${data}\n\n`),
              )
            }

            keepaliveTimer = setInterval(() => {
              if (closed) return
              enqueueOrBuffer(
                controller,
                encoder.encode(': keepalive\n\n'),
                true,
              )
            }, KEEPALIVE_INTERVAL_MS)

            maxDurationTimer = setTimeout(() => {
              if (closed) return
              clearInterval(keepaliveTimer)
              latestKeepalive = null // discard any pending keepalive
              enqueueOrBuffer(
                controller,
                encoder.encode(
                  `event: reconnect\ndata: ${JSON.stringify({ reason: 'max-duration' })}\n\n`,
                ),
              )
              shouldClose = true
              // If pull is waiting, it will close after delivering the reconnect
              if (pullResolve) {
                const resolve = pullResolve
                pullResolve = null
                resolve()
              }
            }, MAX_STREAM_DURATION_MS)

            async function connectUpstream(accessToken: string) {
              const url = `${WALLOW_BASE_URL}/events?subscribe=Notifications`
              reqLog.debug({ url }, 'Upstream connecting')

              const response = await fetch(url, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'text/event-stream',
                },
              })

              if (!response.ok || !response.body) {
                reqLog.error(
                  { status: response.status },
                  `Upstream failed: ${response.statusText}`,
                )
                throw new Error(
                  `Upstream SSE failed: ${response.status} ${response.statusText}`,
                )
              }

              return response.body.getReader()
            }

            async function pipeUpstream(
              reader: ReadableStreamDefaultReader<Uint8Array>,
            ) {
              const decoder = new TextDecoder()
              let buffer = ''

              try {
                while (!closed) {
                  const { value, done } = await reader.read()
                  if (done) break

                  buffer += decoder.decode(value, { stream: true })

                  // Parse complete SSE messages from the buffer
                  const messages = buffer.split('\n\n')
                  buffer = messages.pop()! // keep incomplete last chunk

                  for (const msg of messages) {
                    if (!msg.trim() || msg.trim().startsWith(':')) continue

                    const dataLine = msg
                      .split('\n')
                      .find((l) => l.startsWith('data:'))
                    if (!dataLine) continue

                    try {
                      const envelope: RealtimeEnvelope = JSON.parse(
                        dataLine.slice(5).trim(),
                      )
                      send(envelope)
                    } catch {
                      // Forward raw if not parseable as envelope
                      enqueueOrBuffer(controller, encoder.encode(`${msg}\n\n`))
                    }
                  }
                }
              } catch {
                // Upstream disconnected
              }
            }

            // Use void to handle the async start logic
            void (async () => {
              try {
                upstreamReader = await connectUpstream(session.accessToken)
                reqLog.debug('Upstream connected')
                enqueueOrBuffer(controller, encoder.encode(': connected\n\n'))

                await pipeUpstream(upstreamReader)

                // Upstream ended — attempt reconnect with refreshed token
                if (!closed && session.refreshToken) {
                  try {
                    const tokens = await refreshToken(session.refreshToken)
                    upstreamReader = await connectUpstream(tokens.accessToken)
                    reqLog.debug('Upstream reconnected')
                    await pipeUpstream(upstreamReader)
                  } catch {
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- closed is mutated in cancel()
                    if (!closed) controller.close()
                  }
                } else if (!closed) {
                  controller.close()
                }
              } catch (err) {
                reqLog.error({ err }, 'Upstream connection failed')
                clearInterval(keepaliveTimer)
                controller.close()
              }
            })()
          },
          pull() {
            // Deliver any pending keepalive
            if (latestKeepalive) {
              const chunk = latestKeepalive
              latestKeepalive = null
              try {
                streamController.enqueue(chunk)
              } catch {
                // Client disconnected
              }
              return
            }
            if (shouldClose) {
              try {
                streamController.close()
              } catch {
                // already closed
              }
              return
            }
            // Wait for the next push
            return new Promise<void>((resolve) => {
              pullResolve = resolve
            })
          },
          cancel() {
            reqLog.debug('Client disconnected')
            closed = true
            clearInterval(keepaliveTimer)
            clearTimeout(maxDurationTimer)
            sseManager.unregister(streamController)
            if (pullResolve) {
              pullResolve()
              pullResolve = null
            }
            upstreamReader?.cancel().catch(() => {})
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
