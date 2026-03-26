import { defineWebSocketHandler } from 'h3'
import {
  HttpTransportType,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr'
import type { HubConnection } from '@microsoft/signalr'
import type { Peer } from 'crossws'
import type { SessionData } from '~/lib/auth/types'
import type { RealtimeEnvelope } from '~/lib/wallow/types'
import { refreshToken } from '~/lib/auth/oidc'
import { getSession } from '~/lib/auth/session'

const WALLOW_API_URL = process.env.WALLOW_API_URL!

/** Map of browser peer ID to its upstream Wallow SignalR connection */
const hubConnections = new Map<string, HubConnection>()

/** Build a SignalR hub connection to Wallow with the given access token */
function buildHubConnection(accessToken: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${WALLOW_API_URL}/hubs/realtime`, {
      transport: HttpTransportType.WebSockets,
      accessTokenFactory: () => accessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()
}

export default defineWebSocketHandler({
  async open(peer: Peer) {
    const session = await getSession()
    if (!session?.accessToken) {
      peer.close(4401, 'Unauthorized')
      return
    }

    // Store session data on the peer context for later use
    peer.context.session = session

    const hub = buildHubConnection(session.accessToken)

    // Forward Wallow real-time events to the browser client
    hub.on('ReceiveNotifications', (envelope: RealtimeEnvelope) => {
      peer.send(JSON.stringify({ method: 'ReceiveNotifications', envelope }))
    })

    hub.on('ReceivePresence', (envelope: RealtimeEnvelope) => {
      peer.send(JSON.stringify({ method: 'ReceivePresence', envelope }))
    })

    // Handle Wallow disconnection — attempt reconnect with refreshed token
    hub.onclose(async () => {
      const currentSession = peer.context.session as SessionData | undefined
      if (!currentSession?.refreshToken) return

      try {
        const tokens = await refreshToken(currentSession.refreshToken)
        const newToken = tokens.accessToken
        const reconnectedHub = buildHubConnection(newToken)

        reconnectedHub.on(
          'ReceiveNotifications',
          (envelope: RealtimeEnvelope) => {
            peer.send(
              JSON.stringify({ method: 'ReceiveNotifications', envelope }),
            )
          },
        )
        reconnectedHub.on('ReceivePresence', (envelope: RealtimeEnvelope) => {
          peer.send(JSON.stringify({ method: 'ReceivePresence', envelope }))
        })

        await reconnectedHub.start()
        await reconnectedHub.invoke(
          'JoinGroup',
          `tenant:${currentSession.user.tenantId}`,
        )

        hubConnections.set(peer.id, reconnectedHub)
      } catch {
        peer.close(4500, 'Reconnection failed')
      }
    })

    try {
      await hub.start()
      await hub.invoke('JoinGroup', `tenant:${session.user.tenantId}`)
      hubConnections.set(peer.id, hub)
    } catch {
      peer.close(4500, 'Hub connection failed')
    }
  },

  async message(peer: Peer, message) {
    const hub = hubConnections.get(peer.id)
    if (!hub) return

    try {
      const data = JSON.parse(message.text()) as {
        method: string
        args?: Array<unknown>
      }
      await hub.invoke(data.method, ...(data.args ?? []))
    } catch {
      // Ignore malformed messages from the browser
    }
  },

  async close(peer: Peer) {
    const hub = hubConnections.get(peer.id)
    if (hub) {
      await hub.stop()
      hubConnections.delete(peer.id)
    }
  },
})
