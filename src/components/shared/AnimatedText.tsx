import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface AnimatedTextProps {
  text: string
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  staggerDelay?: number
}

export function AnimatedText({
  text,
  className,
  as: Component = 'span',
  staggerDelay = 30,
}: AnimatedTextProps) {
  const prefersReducedMotion = useReducedMotion()
  const words = text.split(' ')

  if (prefersReducedMotion) {
    return <Component className={className}>{text}</Component>
  }

  return (
    <Component className={cn('inline-block', className)}>
      {words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          className="inline-block animate-fade-in-up opacity-0"
          style={{
            animationDelay: `${wordIndex * staggerDelay}ms`,
            animationFillMode: 'forwards',
          }}
        >
          {word}
          {wordIndex < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </Component>
  )
}
