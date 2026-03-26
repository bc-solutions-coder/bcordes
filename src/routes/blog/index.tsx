import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Calendar, Clock, Tag } from 'lucide-react'
import type {BlogPost} from '@/lib/blog';
import { FadeInView } from '@/components/shared/FadeInView'
import {  formatDate } from '@/lib/blog'
import { getBlogPosts } from '@/lib/blog.server'

const fetchBlogPosts = createServerFn({ method: 'GET' }).handler(async () => {
  return getBlogPosts()
})

export const Route = createFileRoute('/blog/')({
  component: BlogIndex,
  loader: async () => {
    const posts = await fetchBlogPosts()
    return { posts }
  },
})

function BlogPostCard({ post, index }: { post: BlogPost; index: number }) {
  return (
    <FadeInView delay={index * 100}>
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="group block"
      >
        <article className="rounded-xl border border-border-default bg-background-secondary p-6 transition-all duration-300 hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/5">
          {/* Tags */}
          <div className="mb-3 flex flex-wrap gap-2">
            {post.frontmatter.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 px-2.5 py-0.5 text-xs font-medium text-accent-secondary"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h2 className="mb-2 text-xl font-semibold text-text-primary transition-colors group-hover:text-accent-secondary">
            {post.frontmatter.title}
          </h2>

          {/* Excerpt */}
          <p className="mb-4 line-clamp-2 text-text-secondary">
            {post.frontmatter.excerpt}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.frontmatter.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readTime} min read
            </span>
          </div>
        </article>
      </Link>
    </FadeInView>
  )
}

function BlogIndex() {
  const { posts } = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header Section */}
      <section className="border-b border-border-default bg-background-secondary/50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <FadeInView>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
              Blog
            </h1>
            <p className="max-w-2xl text-lg text-text-secondary">
              Thoughts on software engineering, architecture patterns, and
              lessons learned from building products.
            </p>
          </FadeInView>
        </div>
      </section>

      {/* Posts Section */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        {posts.length === 0 ? (
          <FadeInView>
            <div className="rounded-xl border border-border-default bg-background-secondary p-12 text-center">
              <p className="text-text-secondary">
                No blog posts yet. Check back soon!
              </p>
            </div>
          </FadeInView>
        ) : (
          <div className="space-y-6">
            {posts.map((post: BlogPost, index: number) => (
              <BlogPostCard key={post.slug} post={post} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
