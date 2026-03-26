/**
 * Frontmatter interface for blog MDX files
 */
export interface BlogFrontmatter {
  title: string
  date: string
  excerpt: string
  tags: Array<string>
  image?: string
  published?: boolean
}

/**
 * Blog post with parsed frontmatter and content
 */
export interface BlogPost {
  slug: string
  frontmatter: BlogFrontmatter
  content: string
  readTime: number
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
