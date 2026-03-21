import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { BlogFrontmatter, BlogPost } from './blog'

const BLOG_DIR = join(process.cwd(), 'src/content/blog')

/**
 * Parse frontmatter from MDX content
 */
function parseFrontmatter(fileContent: string): {
  frontmatter: Record<string, unknown>
  content: string
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = fileContent.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, content: fileContent }
  }

  const [, frontmatterString, content] = match
  const frontmatter: Record<string, unknown> = {}

  // Parse YAML-like frontmatter
  const lines = frontmatterString.split('\n')
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value: unknown = line.slice(colonIndex + 1).trim()

    // Handle arrays (tags: [tag1, tag2])
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
    }
    // Handle booleans
    else if (value === 'true') {
      value = true
    } else if (value === 'false') {
      value = false
    }
    // Handle numbers
    else if (typeof value === 'string' && !isNaN(Number(value)) && value !== '') {
      value = Number(value)
    }
    // Handle quoted strings
    else if (typeof value === 'string' && /^["'].*["']$/.test(value)) {
      value = value.slice(1, -1)
    }

    frontmatter[key] = value
  }

  return { frontmatter, content: content.trim() }
}

/**
 * Validate and cast frontmatter to BlogFrontmatter
 */
function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  slug: string
): BlogFrontmatter {
  const required = ['title', 'date', 'excerpt', 'tags']
  for (const field of required) {
    if (!(field in frontmatter)) {
      throw new Error(`Missing required frontmatter field "${field}" in ${slug}.mdx`)
    }
  }

  return {
    title: String(frontmatter.title),
    date: String(frontmatter.date),
    excerpt: String(frontmatter.excerpt),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    image: frontmatter.image ? String(frontmatter.image) : undefined,
    published: frontmatter.published !== false, // Default to true if not specified
  }
}

/**
 * Calculate estimated read time based on word count
 * Assumes average reading speed of 200 words per minute
 */
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  const readTime = Math.ceil(wordCount / wordsPerMinute)
  return Math.max(1, readTime) // Minimum 1 minute
}

/**
 * Get all blog posts from the content/blog directory
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const files = await readdir(BLOG_DIR)
    const mdxFiles = files.filter((file) => file.endsWith('.mdx'))

    const posts = await Promise.all(
      mdxFiles.map(async (file) => {
        const slug = file.replace(/\.mdx$/, '')
        const filePath = join(BLOG_DIR, file)
        const fileContent = await readFile(filePath, 'utf-8')

        const { frontmatter, content } = parseFrontmatter(fileContent)
        const validatedFrontmatter = validateFrontmatter(frontmatter, slug)

        return {
          slug,
          frontmatter: validatedFrontmatter,
          content,
          readTime: calculateReadTime(content),
        }
      })
    )

    // Filter out unpublished posts and sort by date descending
    return posts
      .filter((post) => post.frontmatter.published !== false)
      .sort((a, b) => {
        const dateA = new Date(a.frontmatter.date).getTime()
        const dateB = new Date(b.frontmatter.date).getTime()
        return dateB - dateA
      })
  } catch (error) {
    // Return empty array if directory doesn't exist
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = join(BLOG_DIR, `${slug}.mdx`)
    const fileContent = await readFile(filePath, 'utf-8')

    const { frontmatter, content } = parseFrontmatter(fileContent)
    const validatedFrontmatter = validateFrontmatter(frontmatter, slug)

    // Return null for unpublished posts
    if (validatedFrontmatter.published === false) {
      return null
    }

    return {
      slug,
      frontmatter: validatedFrontmatter,
      content,
      readTime: calculateReadTime(content),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

