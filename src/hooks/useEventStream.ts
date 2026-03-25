import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeEnvelope } from '@/lib/wallow/types'

type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
type Handler = (envelope: RealtimeEnvelope) => void

const MAX_ATTEMPTS = 10
const CONNECTION_TIMEOUT_MS = 10_000
const HEARTBEAT_INTERVAL_MS = 5_000
const LEADER_TIMEOUT_MS = 7_000
const BC_CHANNEL_NAME = 'sse-leader'

export function useEventStream() {
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

  const dispatchEnvelope = useCallback((envelope: RealtimeEnvelope) => {
    console.log('[sse] event:', envelope.type)
    const handlers = subscribersRef.current.get(envelope.type)
    if (handlers) {
      handlers.forEach((handler) => handler(envelope))
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    setStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting')

    const es = new EventSource('/api/notifications/stream')
    eventSourceRef.current = es

    // Connection timeout — if onopen doesn't fire within 10s, treat as error
    connectionTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      console.log('[sse] connection timeout')
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
      console.log('[sse] connected')
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
        connectionTimeoutRef.current = null
      }
      console.log('[sse] error/disconnected, will reconnect')
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
        // Relay to followers via BroadcastChannel
        if (isLeaderRef.current && bcRef.current) {
          bcRef.current.postMessage({ type: 'event', envelope })
        }
      } catch {
        // Ignore keepalive comments or malformed data
      }
    }

    // For named SSE events
    const addNamedListener = (eventType: string) => {
      es.addEventListener(eventType, ((event: MessageEvent) => {
        try {
          const envelope: RealtimeEnvelope = JSON.parse(event.data)
          dispatchEnvelope(envelope)
          // Relay to followers
          if (isLeaderRef.current && bcRef.current) {
            bcRef.current.postMessage({ type: 'event', envelope })
          }
        } catch {
          // Ignore malformed data
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

    // Named 'reconnect' event from server
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
      // Schedule a fresh connection with base delay (1s) without incrementing attempt
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 1000)
    }) as EventListener)
  }, [dispatchEnvelope])

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return
    // Clear leader timeout — reconnect logic takes over
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
    mountedRef.current = true

    // BroadcastChannel leader election
    let hasBroadcastChannel = false
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        hasBroadcastChannel = true
      }
    } catch {
      // BroadcastChannel not available
    }

    if (hasBroadcastChannel) {
      const bc = new BroadcastChannel(BC_CHANNEL_NAME)
      bcRef.current = bc

      // Become leader immediately (first tab wins, others will get heartbeats)
      isLeaderRef.current = true
      connect()

      // Send heartbeats as leader
      heartbeatTimerRef.current = setInterval(() => {
        if (isLeaderRef.current && bcRef.current) {
          bcRef.current.postMessage({ type: 'heartbeat' })
        }
      }, HEARTBEAT_INTERVAL_MS)

      // Set up leader timeout — if we don't hear a heartbeat within 7s, promote self
      const resetLeaderTimeout = () => {
        if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current)
        leaderTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          const wasLeader = isLeaderRef.current
          if (!wasLeader) {
            // Start sending heartbeats when promoting from follower
            heartbeatTimerRef.current = setInterval(() => {
              if (isLeaderRef.current && bcRef.current) {
                bcRef.current.postMessage({ type: 'heartbeat' })
              }
            }, HEARTBEAT_INTERVAL_MS)
          }
          isLeaderRef.current = true
          reconnectAttemptRef.current = 0
          // Only connect if we weren't already leader or if not currently connected
          if (!wasLeader || !connectedRef.current) {
            connect()
          }
        }, LEADER_TIMEOUT_MS)
      }

      resetLeaderTimeout()

      bc.onmessage = (event: MessageEvent) => {
        const data = event.data
        if (data.type === 'heartbeat') {
          resetLeaderTimeout()
        } else if (data.type === 'event') {
          // Follower receives relayed events
          dispatchEnvelope(data.envelope)
        } else if (data.type === 'leader-resign') {
          // Leader resigned, promote after timeout
          resetLeaderTimeout()
        }
      }
    } else {
      // No BroadcastChannel — just connect directly
      connect()
    }

    // Visibility-aware reconnect
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !mountedRef.current === false
      ) {
        // Only reconnect if disconnected
        // We check the ref rather than state to avoid stale closures
        if (eventSourceRef.current === null || status === 'disconnected') {
          // Clear any pending reconnect timer
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

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (connectionTimeoutRef.current)
        clearTimeout(connectionTimeoutRef.current)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
      if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current)
      if (bcRef.current) {
        bcRef.current.postMessage({ type: 'leader-resign' })
        bcRef.current.close()
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connect, dispatchEnvelope])

  return { status, subscribe }
}
