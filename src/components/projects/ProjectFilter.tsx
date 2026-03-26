import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProjectFilterProps {
  tags: Array<string>
  years: Array<number>
  selectedTag: string | null
  selectedYear: number | null
  onTagChange: (tag: string | null) => void
  onYearChange: (year: number | null) => void
  className?: string
}

export function ProjectFilter({
  tags,
  years,
  selectedTag,
  selectedYear,
  onTagChange,
  onYearChange,
  className,
}: ProjectFilterProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Tags Filter */}
      <div>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-tertiary">
          Filter by Technology
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onTagChange(null)}
            className={cn(
              'cursor-pointer transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary rounded-full',
            )}
          >
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className={cn(
                'px-3 py-1',
                selectedTag === null
                  ? 'bg-accent-primary text-white hover:bg-accent-secondary'
                  : 'border-border-default text-text-secondary hover:border-accent-primary/50 hover:text-text-primary',
              )}
            >
              All
            </Badge>
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagChange(tag)}
              className={cn(
                'cursor-pointer transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary rounded-full',
              )}
            >
              <Badge
                variant={selectedTag === tag ? 'default' : 'outline'}
                className={cn(
                  'px-3 py-1',
                  selectedTag === tag
                    ? 'bg-accent-primary text-white hover:bg-accent-secondary'
                    : 'border-border-default text-text-secondary hover:border-accent-primary/50 hover:text-text-primary',
                )}
              >
                {tag}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Years Filter */}
      <div>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-tertiary">
          Filter by Year
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onYearChange(null)}
            className={cn(
              'cursor-pointer transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary rounded-full',
            )}
          >
            <Badge
              variant={selectedYear === null ? 'default' : 'outline'}
              className={cn(
                'px-3 py-1',
                selectedYear === null
                  ? 'bg-accent-primary text-white hover:bg-accent-secondary'
                  : 'border-border-default text-text-secondary hover:border-accent-primary/50 hover:text-text-primary',
              )}
            >
              All Years
            </Badge>
          </button>
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => onYearChange(year)}
              className={cn(
                'cursor-pointer transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary rounded-full',
              )}
            >
              <Badge
                variant={selectedYear === year ? 'default' : 'outline'}
                className={cn(
                  'px-3 py-1',
                  selectedYear === year
                    ? 'bg-accent-primary text-white hover:bg-accent-secondary'
                    : 'border-border-default text-text-secondary hover:border-accent-primary/50 hover:text-text-primary',
                )}
              >
                {year}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
