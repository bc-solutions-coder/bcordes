import { readFile, readdir } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBlogPostBySlug, getBlogPosts } from '@/lib/blog.server'

vi.mock('node:fs/promises')

const mockReaddir = vi.mocked(readdir)
const mockReadFile = vi.mocked(readFile)

function mdxFile(
  overrides: Record<string, unknown> = {},
  body = 'Blog content here with enough words.',
) {
  const defaults = {
    title: 'Test Post',
    date: '2026-01-15',
    excerpt: 'A test excerpt',
    tags: '[typescript, testing]',
    published: true,
  }
  const merged = { ...defaults, ...overrides }
  const frontmatter = Object.entries(merged)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return `---\n${frontmatter}\n---\n${body}`
}

describe('getBlogPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns posts sorted by date descending', async () => {
    mockReaddir.mockResolvedValue(['old.mdx', 'new.mdx'] as unknown as Awaited<
      ReturnType<typeof readdir>
    >)
    mockReadFile.mockImplementation(((path: string) => {
      if (path.includes('old.mdx')) {
        return Promise.resolve(
          mdxFile({ title: 'Old Post', date: '2025-01-01' }),
        )
      }
      return Promise.resolve(mdxFile({ title: 'New Post', date: '2026-06-01' }))
    }) as typeof readFile)

    const posts = await getBlogPosts()

    expect(posts).toHaveLength(2)
    expect(posts[0].frontmatter.title).toBe('New Post')
    expect(posts[1].frontmatter.title).toBe('Old Post')
  })

  it('skips unpublished posts', async () => {
    mockReaddir.mockResolvedValue([
      'published.mdx',
      'draft.mdx',
    ] as unknown as Awaited<ReturnType<typeof readdir>>)
    mockReadFile.mockImplementation(((path: string) => {
      if (path.includes('draft.mdx')) {
        return Promise.resolve(mdxFile({ title: 'Draft', published: false }))
      }
      return Promise.resolve(mdxFile({ title: 'Published' }))
    }) as typeof readFile)

    const posts = await getBlogPosts()

    expect(posts).toHaveLength(1)
    expect(posts[0].frontmatter.title).toBe('Published')
  })

  it('returns empty array when directory does not exist', async () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException
    err.code = 'ENOENT'
    mockReaddir.mockRejectedValue(err)

    const posts = await getBlogPosts()

    expect(posts).toEqual([])
  })

  it('rethrows non-ENOENT errors', async () => {
    mockReaddir.mockRejectedValue(new Error('permission denied'))

    await expect(getBlogPosts()).rejects.toThrow('permission denied')
  })

  it('ignores non-mdx files', async () => {
    mockReaddir.mockResolvedValue([
      'post.mdx',
      'readme.txt',
      'image.png',
    ] as unknown as Awaited<ReturnType<typeof readdir>>)
    mockReadFile.mockResolvedValue(
      mdxFile({ title: 'Only Post' }) as unknown as Awaited<
        ReturnType<typeof readFile>
      >,
    )

    const posts = await getBlogPosts()

    expect(posts).toHaveLength(1)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
  })
})

describe('getBlogPostBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a valid published post', async () => {
    mockReadFile.mockResolvedValue(
      mdxFile({
        title: 'My Post',
        date: '2026-03-01',
        excerpt: 'An excerpt',
        tags: '[vitest]',
      }) as unknown as Awaited<ReturnType<typeof readFile>>,
    )

    const post = await getBlogPostBySlug('my-post')

    expect(post).not.toBeNull()
    expect(post!.slug).toBe('my-post')
    expect(post!.frontmatter.title).toBe('My Post')
    expect(post!.readTime).toBeGreaterThanOrEqual(1)
  })

  it('returns null for a missing slug', async () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException
    err.code = 'ENOENT'
    mockReadFile.mockRejectedValue(err)

    const post = await getBlogPostBySlug('nonexistent')

    expect(post).toBeNull()
  })

  it('returns null for an unpublished post', async () => {
    mockReadFile.mockResolvedValue(
      mdxFile({
        title: 'Draft Post',
        published: false,
      }) as unknown as Awaited<ReturnType<typeof readFile>>,
    )

    const post = await getBlogPostBySlug('draft-post')

    expect(post).toBeNull()
  })

  it('rethrows non-ENOENT errors', async () => {
    mockReadFile.mockRejectedValue(new Error('disk failure'))

    await expect(getBlogPostBySlug('broken')).rejects.toThrow('disk failure')
  })
})
