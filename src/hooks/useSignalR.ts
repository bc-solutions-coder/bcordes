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
  const wsRef = useRef<WebSocket | null>(null)
  const subscribersRef = useRef<Map<string, Set<Handler>>>(new Map())
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/ws/realtime`

    setStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      reconnectAttemptRef.current = 0
      setStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const envelope: RealtimeEnvelope = JSON.parse(event.data)
        const handlers = subscribersRef.current.get(envelope.type)
        if (handlers) {
          handlers.forEach((handler) => handler(envelope))
        }
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setStatus('disconnected')
      scheduleReconnect()
    }

    ws.onerror = () => {
      // onclose will fire after onerror, reconnect handled there
    }
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
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  return { status, subscribe }
}
