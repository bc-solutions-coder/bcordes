import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeEnvelope } from '@/lib/wallow/types'

type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
type Handler = (envelope: RealtimeEnvelope) => void

export function useSignalR() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const eventSourceRef = useRef<EventSource | null>(null)
  const subscribersRef = useRef<Map<string, Set<Handler>>>(new Map())
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    setStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting')

    const es = new EventSource('/api/notifications/stream')
    eventSourceRef.current = es

    es.onopen = () => {
      if (!mountedRef.current) return
      reconnectAttemptRef.current = 0
      setStatus('connected')
      console.log('[sse] connected')
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      console.log('[sse] error/disconnected, will reconnect')
      es.close()
      setStatus('disconnected')
      scheduleReconnect()
    }

    // Register a listener for each known event type, plus a catch-all
    // via the generic 'message' event for unnamed events
    const dispatchEnvelope = (envelope: RealtimeEnvelope) => {
      console.log('[sse] event:', envelope.type)
      const handlers = subscribersRef.current.get(envelope.type)
      if (handlers) {
        handlers.forEach((handler) => handler(envelope))
      }
    }

    // SSE named events — the server sends `event: <type>\ndata: <json>\n\n`
    // We register listeners dynamically when subscribers are added,
    // but also handle via the generic message listener as fallback
    es.onmessage = (event) => {
      try {
        const envelope: RealtimeEnvelope = JSON.parse(event.data)
        dispatchEnvelope(envelope)
      } catch {
        // Ignore keepalive comments or malformed data
      }
    }

    // For named SSE events, EventSource dispatches to event-specific listeners
    // We need to add listeners for the event types our subscribers care about
    const addNamedListener = (eventType: string) => {
      es.addEventListener(eventType, ((event: MessageEvent) => {
        try {
          const envelope: RealtimeEnvelope = JSON.parse(event.data)
          dispatchEnvelope(envelope)
        } catch {
          // Ignore malformed data
        }
      }) as EventListener)
    }

    // Pre-register all known notification event types
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
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return
    const attempt = reconnectAttemptRef.current
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
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [connect])

  return { status, subscribe }
}
