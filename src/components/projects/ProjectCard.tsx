import { Link } from '@tanstack/react-router'
import type { ShowcaseMeta } from '@/content/projects'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  showcase: ShowcaseMeta
  className?: string
}

export function ProjectCard({ showcase, className }: ProjectCardProps) {
  const { slug, title, tags, image, description, year } = showcase

  return (
    <Link
      to="/projects/$slug"
      params={{ slug }}
      className={cn(
        'group block overflow-hidden rounded-xl border border-border bg-secondary',
        'transition-all duration-300 ease-out',
        'hover:scale-[1.02] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={`${title} project thumbnail`}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-4xl font-bold text-muted-foreground opacity-50">
              {title.charAt(0)}
            </div>
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Year */}
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>{year}</span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
          {title}
        </h3>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-foreground-secondary">
          {description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="border border-border bg-muted text-xs text-foreground-secondary transition-colors duration-200 group-hover:border-primary/30 group-hover:text-foreground"
            >
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge
              variant="secondary"
              className="border border-border bg-muted text-xs text-muted-foreground"
            >
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  )
}
