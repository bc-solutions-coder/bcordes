import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import type { BlogFrontmatter, BlogPost } from './blog'

const BLOG_DIR = join(process.cwd(), 'src/content/blog')

function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  slug: string,
): BlogFrontmatter {
  const required = ['title', 'date', 'excerpt', 'tags']
  for (const field of required) {
    if (!(field in frontmatter)) {
      throw new Error(
        `Missing required frontmatter field "${field}" in ${slug}.mdx`,
      )
    }
  }

  return {
    title: String(frontmatter.title),
    date: String(frontmatter.date),
    excerpt: String(frontmatter.excerpt),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    image: frontmatter.image ? String(frontmatter.image) : undefined,
    published: frontmatter.published !== false,
  }
}

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

export async function getBlogPosts(): Promise<Array<BlogPost>> {
  try {
    const files = await readdir(BLOG_DIR)
    const mdxFiles = files.filter((file) => file.endsWith('.mdx'))

    const posts = await Promise.all(
      mdxFiles.map(async (file) => {
        const slug = file.replace(/\.mdx$/, '')
        const filePath = join(BLOG_DIR, file)
        const fileContent = await readFile(filePath, 'utf-8')

        const { data, content } = matter(fileContent)
        const validatedFrontmatter = validateFrontmatter(
          data as Record<string, unknown>,
          slug,
        )

        return {
          slug,
          frontmatter: validatedFrontmatter,
          content,
          readTime: calculateReadTime(content),
        }
      }),
    )

    return posts
      .filter((post) => post.frontmatter.published !== false)
      .sort((a, b) => {
        const dateA = new Date(a.frontmatter.date).getTime()
        const dateB = new Date(b.frontmatter.date).getTime()
        return dateB - dateA
      })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function getBlogPostBySlug(
  slug: string,
): Promise<BlogPost | null> {
  try {
    const filePath = join(BLOG_DIR, `${slug}.mdx`)
    const fileContent = await readFile(filePath, 'utf-8')

    const { data, content } = matter(fileContent)
    const validatedFrontmatter = validateFrontmatter(
      data as Record<string, unknown>,
      slug,
    )

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
