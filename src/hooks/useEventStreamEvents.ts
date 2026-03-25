import { useEffect } from 'react'
import type { RealtimeEnvelope } from '@/lib/wallow/types'
import { useSignalR } from '@/hooks/useSignalR'

type Handler = (envelope: RealtimeEnvelope) => void

export function useSignalREvents(events: Record<string, Handler>) {
  const { subscribe } = useSignalR()

  useEffect(() => {
    const unsubs = Object.entries(events).map(([event, handler]) =>
      subscribe(event, handler),
    )
    return () => unsubs.forEach((unsub) => unsub())
  }, [subscribe])
}
