import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ShowcaseMeta } from '@/content/projects'
import { FadeInView } from '@/components/shared/FadeInView'
import { Badge } from '@/components/ui/shadcn/badge'
import { getShowcaseContent, getShowcases } from '@/content/projects'

export const Route = createFileRoute('/projects/$slug')({
  component: ShowcaseDetailPage,
  loader: ({ params }): { showcase: ShowcaseMeta } => {
    const showcases = getShowcases()
    const showcase = showcases.find((s) => s.slug === params.slug)
    if (!showcase) throw notFound()
    return { showcase }
  },
  head: ({ loaderData }) => {
    const { showcase } = loaderData
    const title = `${showcase.title} | BC Solutions`
    return {
      meta: [
        { title },
        { name: 'description', content: showcase.description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: showcase.description },
        {
          property: 'og:url',
          content: `https://bcordes.dev/projects/${showcase.slug}`,
        },
        ...(showcase.image
          ? [{ property: 'og:image', content: showcase.image }]
          : []),
      ],
    }
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold text-foreground">
          Project Not Found
        </h1>
        <p className="mb-8 text-foreground-secondary">
          The project you are looking for does not exist.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>
    </div>
  ),
})

function ShowcaseDetailPage() {
  const { showcase } = Route.useLoaderData()
  const Content = getShowcaseContent(showcase.slug)

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <section className="mx-auto mt-8 max-w-[1440px] px-6">
        <div className="flex flex-col items-center gap-8 rounded-2xl border border-border bg-secondary/50 px-8 py-12 md:flex-row md:px-12">
          <FadeInView className="flex-1">
            {/* Back Link */}
            <Link
              to="/projects"
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Link>

            {/* Year */}
            <div className="mb-4 text-sm text-muted-foreground">
              <span>{showcase.year}</span>
            </div>

            {/* Title */}
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {showcase.title}
            </h1>

            {/* Description */}
            <p className="mb-6 text-lg text-foreground-secondary">
              {showcase.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {showcase.tags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="border border-border bg-muted text-foreground-secondary"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </FadeInView>

          {showcase.image && (
            <FadeInView delay={100} className="shrink-0">
              <div className="inline-block overflow-hidden rounded-2xl">
                <img
                  src={showcase.image}
                  alt={showcase.title}
                  className="block h-64 w-auto"
                />
              </div>
            </FadeInView>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <FadeInView delay={150}>
          <div className="rounded-2xl border border-border bg-secondary/50 p-8">
            {Content ? <Content /> : null}
          </div>
        </FadeInView>
      </section>

      {/* Footer Navigation */}
      <section className="mx-auto mb-8 max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-border bg-secondary/50 px-6 py-8">
          <FadeInView delay={200}>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all projects
            </Link>
          </FadeInView>
        </div>
      </section>
    </div>
  )
}
