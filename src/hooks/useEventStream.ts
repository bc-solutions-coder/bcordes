import { useContext } from 'react'
import { EventStreamContext } from './EventStreamProvider'
import type { EventStreamContextValue } from './EventStreamProvider'

export type { EventStreamContextValue }

export function useEventStream(): EventStreamContextValue {
  const context = useContext(EventStreamContext)
  if (!context) {
    throw new Error('useEventStream must be used within an EventStreamProvider')
  }
  return context
}
