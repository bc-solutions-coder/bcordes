import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { ShowcaseMeta } from '@/content/projects'
import { FadeInView } from '@/components/shared/FadeInView'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface FeaturedWorkProps {
  showcases: Array<ShowcaseMeta>
}

export function FeaturedWork({ showcases }: FeaturedWorkProps) {
  if (showcases.length === 0) {
    return null
  }

  return (
    <section className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <FadeInView delay={0}>
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Featured Work
              </h2>
              <p className="text-lg text-foreground-secondary">
                Recent projects I'm proud of
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              className="text-primary hover:text-primary-hover hover:bg-primary/10"
            >
              <Link to="/projects" className="flex items-center gap-2">
                View all work
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </FadeInView>

        {/* Card grid */}
        <FadeInView delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showcases.map((showcase) => (
              <Link
                key={showcase.slug}
                to="/projects/$slug"
                params={{ slug: showcase.slug }}
                className="group block rounded-xl border-l-4 border-decorative bg-background p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-primary-hover">
                    {showcase.year}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {showcase.client}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {showcase.title}
                </h3>
                <p className="text-sm text-foreground-secondary line-clamp-2 mb-4">
                  {showcase.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {showcase.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs bg-muted border-border text-muted-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </FadeInView>
      </div>
    </section>
  )
}
