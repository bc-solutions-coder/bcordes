import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react'
import { FadeInView } from '@/components/shared/FadeInView'
import { MarkdownContent } from '@/components/shared/MarkdownContent'
import { formatDate } from '@/lib/blog'
import { getBlogPostBySlug } from '@/lib/blog.server'

const fetchBlogPost = createServerFn({ method: 'GET' })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    return getBlogPostBySlug(slug)
  })

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPostPage,
  loader: async ({ params }) => {
    const post = await fetchBlogPost({ data: params.slug })
    if (!post) {
      throw notFound()
    }
    return { post }
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background-primary">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold text-text-primary">Post Not Found</h1>
        <p className="mb-8 text-text-secondary">
          The blog post you're looking for doesn't exist.
        </p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-tertiary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </div>
    </div>
  ),
})

function BlogPostPage() {
  const { post } = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header Section */}
      <section className="border-b border-border-default bg-background-secondary/50">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <FadeInView>
            {/* Back Link */}
            <Link
              to="/blog"
              className="mb-6 inline-flex items-center gap-2 text-sm text-text-tertiary transition-colors hover:text-accent-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>

            {/* Tags */}
            <div className="mb-4 flex flex-wrap gap-2">
              {post.frontmatter.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 px-3 py-1 text-sm font-medium text-accent-secondary"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-text-primary md:text-4xl lg:text-5xl">
              {post.frontmatter.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(post.frontmatter.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readTime} min read
              </span>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <FadeInView delay={100}>
          <article className="prose prose-invert max-w-none prose-headings:text-text-primary prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-text-secondary prose-p:leading-relaxed prose-a:text-accent-secondary prose-a:no-underline hover:prose-a:underline prose-strong:text-text-primary prose-code:text-accent-secondary prose-code:bg-background-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:bg-background-tertiary prose-pre:border prose-pre:border-border-default prose-ul:text-text-secondary prose-ol:text-text-secondary prose-li:marker:text-text-tertiary prose-blockquote:border-accent-primary prose-blockquote:text-text-secondary prose-blockquote:not-italic">
            <MarkdownContent content={post.content} />
          </article>
        </FadeInView>
      </section>

      {/* Footer Navigation */}
      <section className="border-t border-border-default bg-background-secondary/50">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <FadeInView delay={200}>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-background-secondary px-4 py-2 text-sm font-medium text-text-primary transition-all hover:border-accent-primary/50 hover:text-accent-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all posts
            </Link>
          </FadeInView>
        </div>
      </section>
    </div>
  )
}
