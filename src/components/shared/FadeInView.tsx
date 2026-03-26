import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface FadeInViewProps {
  children: React.ReactNode
  className?: string
  delay?: number
  threshold?: number
}

export function FadeInView({
  children,
  className,
  delay = 0,
  threshold = 0.1,
}: FadeInViewProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold })
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-500 ease-out',
        prefersReducedMotion
          ? 'opacity-100 translate-y-0'
          : isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8',
        className,
      )}
      style={{
        transitionDelay: prefersReducedMotion ? '0ms' : `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}
