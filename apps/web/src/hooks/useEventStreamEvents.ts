import { useEffect } from 'react'
import type { RealtimeEnvelope } from '@/lib/wallow/types'
import { useEventStream } from '@/hooks/useEventStream'

type Handler = (envelope: RealtimeEnvelope) => void

export function useEventStreamEvents(events: Record<string, Handler>) {
  const { subscribe } = useEventStream()

  useEffect(() => {
    const unsubs = Object.entries(events).map(([event, handler]) =>
      subscribe(event, handler),
    )
    return () => unsubs.forEach((unsub) => unsub())
  }, [subscribe])
}
