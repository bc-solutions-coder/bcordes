import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { RealtimeEnvelope } from '@bcordes/wallow/types'
import { useUser } from '@/shared/auth'

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
export type Handler = (envelope: RealtimeEnvelope) => void

export interface EventStreamContextValue {
  status: ConnectionStatus
  subscribe: (method: string, handler: Handler) => () => void
}

export const EventStreamContext = createContext<EventStreamContextValue | null>(
  null,
)

const MAX_ATTEMPTS = 10
const CONNECTION_TIMEOUT_MS = 10_000
const HEARTBEAT_INTERVAL_MS = 5_000
const LEADER_TIMEOUT_MS = 7_000
const CLAIM_WAIT_MS = 200
const BC_CHANNEL_NAME = 'sse-leader'

export function EventStreamProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const previousUser = useRef<string | undefined>(undefined)
  useEffect(() => {
    const identity = user ? `${user.tenantId}:${user.id}` : undefined
    if (previousUser.current !== identity) {
      queryClient.removeQueries({ queryKey: ['notifications'] })
      queryClient.removeQueries({ queryKey: ['notification-settings'] })
    }
    previousUser.current = identity
  }, [user?.id, user?.tenantId, queryClient])
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const eventSourceRef = useRef<EventSource | null>(null)
  const subscribersRef = useRef<Map<string, Set<Handler>>>(new Map())
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const mountedRef = useRef(true)
  const connectedRef = useRef(false)
  const isLeaderRef = useRef(false)
  const bcRef = useRef<BroadcastChannel | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const leaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const claimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dispatchEnvelope = useCallback((envelope: RealtimeEnvelope) => {
    if (!envelope.type && !envelope.payload) return
    const handlers = subscribersRef.current.get(envelope.type)
    if (handlers) {
      handlers.forEach((handler) => handler(envelope))
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    heartbeatTimerRef.current = setInterval(() => {
      if (isLeaderRef.current && bcRef.current) {
        bcRef.current.postMessage({ type: 'heartbeat' })
      }
    }, HEARTBEAT_INTERVAL_MS)
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    setStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting')

    const es = new EventSource('/api/events?subscribe=Notifications,Inquiries')
    eventSourceRef.current = es

    connectionTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      es.close()
      setStatus('disconnected')
      scheduleReconnect()
    }, CONNECTION_TIMEOUT_MS)

    es.onopen = () => {
      if (!mountedRef.current) return
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
        connectionTimeoutRef.current = null
      }
      if (leaderTimeoutRef.current) {
        clearTimeout(leaderTimeoutRef.current)
        leaderTimeoutRef.current = null
      }
      reconnectAttemptRef.current = 0
      connectedRef.current = true
      setStatus('connected')
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      dispatchEnvelope({
        type: 'Resync',
        module: 'Inquiries',
        payload: null,
        timestamp: new Date().toISOString(),
      })
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
        connectionTimeoutRef.current = null
      }
      es.close()
      eventSourceRef.current = null
      connectedRef.current = false
      setStatus('disconnected')
      scheduleReconnect()
    }

    es.onmessage = (event) => {
      try {
        const envelope: RealtimeEnvelope = JSON.parse(event.data)
        dispatchEnvelope(envelope)
        if (isLeaderRef.current && bcRef.current) {
          bcRef.current.postMessage({ type: 'event', envelope })
        }
      } catch {
        // Ignore failures while parsing, dispatching, or relaying this event.
      }
    }

    const addNamedListener = (eventType: string) => {
      es.addEventListener(eventType, ((event: MessageEvent) => {
        try {
          const envelope: RealtimeEnvelope = JSON.parse(event.data)
          dispatchEnvelope(envelope)
          if (isLeaderRef.current && bcRef.current) {
            bcRef.current.postMessage({ type: 'event', envelope })
          }
        } catch {
          // Ignore failures while parsing, dispatching, or relaying this event.
        }
      }) as EventListener)
    }

    const knownTypes = [
      'NotificationCreated',
      'InquirySubmitted',
      'InquiryStatusUpdated',
      'InquiryCommentAdded',
      'TaskAssigned',
      'TaskCompleted',
      'TaskComment',
      'SystemAlert',
      'Announcement',
      'ReceivePresence',
    ]
    knownTypes.forEach(addNamedListener)

    es.addEventListener('reconnect', ((event: MessageEvent) => {
      try {
        JSON.parse(event.data)
      } catch {
        return
      }
      if (!mountedRef.current) return
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
        connectionTimeoutRef.current = null
      }
      es.close()
      reconnectAttemptRef.current = 0
      // Server-requested reconnects restart at the base delay.
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 1000)
    }) as EventListener)
  }, [dispatchEnvelope, queryClient])

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return
    // Reconnecting takes over from leader expiry.
    if (leaderTimeoutRef.current) {
      clearTimeout(leaderTimeoutRef.current)
      leaderTimeoutRef.current = null
    }
    const attempt = reconnectAttemptRef.current
    if (attempt >= MAX_ATTEMPTS) return
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
    reconnectAttemptRef.current = attempt + 1
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connect()
    }, delay)
  }, [connect])

  const subscribe = useCallback(
    (method: string, handler: Handler): (() => void) => {
      if (!subscribersRef.current.has(method)) {
        subscribersRef.current.set(method, new Set())
      }
      subscribersRef.current.get(method)!.add(handler)

      return () => {
        const handlers = subscribersRef.current.get(method)
        if (handlers) {
          handlers.delete(handler)
          if (handlers.size === 0) subscribersRef.current.delete(method)
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (!user) {
      setStatus('disconnected')
      return
    }

    mountedRef.current = true

    const startClaimRound = () => {
      if (!mountedRef.current || !bcRef.current) return
      isLeaderRef.current = false
      bcRef.current.postMessage({ type: 'claim' })
      if (claimTimerRef.current) clearTimeout(claimTimerRef.current)
      claimTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        isLeaderRef.current = true
        connect()
        startHeartbeat()
      }, CLAIM_WAIT_MS)
    }

    const resetLeaderTimeout = () => {
      if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current)
      leaderTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        // Allow an existing leader to respond before promoting this tab.
        startClaimRound()
      }, LEADER_TIMEOUT_MS)
    }

    let hasBroadcastChannel = false
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        hasBroadcastChannel = true
      }
    } catch {
      // BroadcastChannel not available
    }

    if (hasBroadcastChannel) {
      const bc = new BroadcastChannel(
        `${BC_CHANNEL_NAME}:${user.tenantId}:${user.id}`,
      )
      bcRef.current = bc

      bc.onmessage = (event: MessageEvent) => {
        const data = event.data
        if (data.type === 'heartbeat') {
          if (!isLeaderRef.current) {
            resetLeaderTimeout()
          }
        } else if (data.type === 'event') {
          if (!isLeaderRef.current) {
            dispatchEnvelope(data.envelope)
          }
        } else if (data.type === 'leader-resign') {
          startClaimRound()
        } else if (data.type === 'claim') {
          if (isLeaderRef.current) {
            bc.postMessage({ type: 'already-leader' })
            bc.postMessage({ type: 'heartbeat' })
          }
        } else if (data.type === 'already-leader') {
          if (claimTimerRef.current) {
            clearTimeout(claimTimerRef.current)
            claimTimerRef.current = null
          }
          isLeaderRef.current = false
          resetLeaderTimeout()
        }
      }

      startClaimRound()
    } else {
      connect()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] })
        dispatchEnvelope({
          type: 'Resync',
          module: 'Inquiries',
          payload: null,
          timestamp: new Date().toISOString(),
        })
        // Followers rely on the leader to reconnect.
        if (
          isLeaderRef.current &&
          (eventSourceRef.current === null || !connectedRef.current)
        ) {
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current)
            reconnectTimerRef.current = null
          }
          reconnectAttemptRef.current = 0
          connect()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    const resyncTimer = setInterval(() => {
      dispatchEnvelope({
        type: 'Resync',
        module: 'Inquiries',
        payload: null,
        timestamp: new Date().toISOString(),
      })
    }, 60_000)

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (connectionTimeoutRef.current)
        clearTimeout(connectionTimeoutRef.current)
      if (claimTimerRef.current) clearTimeout(claimTimerRef.current)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
      if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current)
      if (bcRef.current) {
        bcRef.current.postMessage({ type: 'leader-resign' })
        bcRef.current.close()
      }
      clearInterval(resyncTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, connect, dispatchEnvelope, startHeartbeat, queryClient])

  return (
    <EventStreamContext.Provider value={{ status, subscribe }}>
      {children}
    </EventStreamContext.Provider>
  )
}
