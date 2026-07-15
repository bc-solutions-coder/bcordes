import { useEffect } from 'react'
import { useEventStream } from './useEventStream'
import type { RealtimeEnvelope } from '@bcordes/wallow/types'

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
