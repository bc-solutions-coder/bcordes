import { useCallback, useState } from 'react'
import type { Notification } from '@/lib/wallow/types'

export function useNotificationSelection(
  filteredNotifications: Array<Notification>,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedIds.has(n.id))

  const selectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(
        checked
          ? new Set(filteredNotifications.map((n) => n.id))
          : new Set(),
      )
    },
    [filteredNotifications],
  )

  const selectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  return { selectedIds, allSelected, selectAll, selectOne, clearSelection }
}
