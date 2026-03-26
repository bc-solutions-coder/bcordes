interface ValueIconProps {
  d: string
}

export function ValueIcon({ d }: ValueIconProps) {
  return (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d={d}
      />
    </svg>
  )
}
