/** Map API PascalCase status values to frontend lowercase */
export const STATUS_TO_FRONTEND: Record<string, string> = {
  New: 'new',
  Reviewed: 'reviewed',
  Contacted: 'contacted',
  Closed: 'closed',
}

/** Map frontend lowercase status values to API PascalCase */
export const STATUS_TO_API: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  closed: 'Closed',
}

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  reviewed: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  contacted: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  closed: 'Closed',
}
