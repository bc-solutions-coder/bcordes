import { Badge } from '@/components/ui/shadcn/badge'
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
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Filter by Technology
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onTagChange(null)}
            className={cn(
              'cursor-pointer transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full',
            )}
          >
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className={cn(
                'px-3 py-1',
                selectedTag === null
                  ? 'bg-primary text-white hover:bg-primary'
                  : 'border-border text-foreground-secondary hover:border-primary/50 hover:text-foreground',
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full',
              )}
            >
              <Badge
                variant={selectedTag === tag ? 'default' : 'outline'}
                className={cn(
                  'px-3 py-1',
                  selectedTag === tag
                    ? 'bg-primary text-white hover:bg-primary'
                    : 'border-border text-foreground-secondary hover:border-primary/50 hover:text-foreground',
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
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Filter by Year
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onYearChange(null)}
            className={cn(
              'cursor-pointer transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full',
            )}
          >
            <Badge
              variant={selectedYear === null ? 'default' : 'outline'}
              className={cn(
                'px-3 py-1',
                selectedYear === null
                  ? 'bg-primary text-white hover:bg-primary'
                  : 'border-border text-foreground-secondary hover:border-primary/50 hover:text-foreground',
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full',
              )}
            >
              <Badge
                variant={selectedYear === year ? 'default' : 'outline'}
                className={cn(
                  'px-3 py-1',
                  selectedYear === year
                    ? 'bg-primary text-white hover:bg-primary'
                    : 'border-border text-foreground-secondary hover:border-primary/50 hover:text-foreground',
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
