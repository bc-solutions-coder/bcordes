# MDX Showcases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Wallow API-driven showcase system with local MDX files, using the existing `mdx.server.ts` module and `src/content/projects/` directory.

**Architecture:** Evolve `src/lib/mdx.server.ts` to parse MDX frontmatter with `gray-matter` + Zod validation and return raw markdown content. Route loaders call these utilities directly (no `createServerFn` wrappers). Content renders client-side using the blog's existing `processContent` pattern, extracted into a shared component.

**Tech Stack:** gray-matter, Zod, TanStack Start loaders, React, Tailwind prose classes

---

## File Structure

| Action | File                                        | Responsibility                                                                                                 |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Modify | `src/lib/mdx.server.ts`                     | Showcase content utilities: `getShowcases()`, `getShowcase()`, `getFeaturedShowcases()` with gray-matter + Zod |
| Create | `src/components/shared/MarkdownContent.tsx` | Shared markdown renderer extracted from blog                                                                   |
| Modify | `src/routes/blog/$slug.tsx`                 | Import `MarkdownContent` instead of inline `BlogContent`                                                       |
| Modify | `src/routes/work/index.tsx`                 | Switch loader from Wallow API to `getShowcases()`                                                              |
| Modify | `src/routes/work/$slug.tsx`                 | Switch loader to `getShowcase()`, add body rendering                                                           |
| Modify | `src/routes/index.tsx`                      | Switch loader to `getFeaturedShowcases()`                                                                      |
| Modify | `src/components/work/ProjectCard.tsx`       | Accept `ShowcaseMeta`, use `slug` instead of `id`                                                              |
| Modify | `src/components/home/FeaturedWork.tsx`      | Accept `ShowcaseMeta[]`, use `slug` instead of `id`                                                            |
| Create | `src/content/projects/sample-project.mdx`   | Sample MDX file for development/testing                                                                        |
| Delete | `src/server-fns/showcases.ts`               | Remove Wallow showcase server functions                                                                        |
| Modify | `src/lib/wallow/types.ts`                   | Remove `Showcase` interface                                                                                    |

---

### Task 1: Install gray-matter

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install gray-matter**

```bash
pnpm add gray-matter
```

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add gray-matter dependency for MDX frontmatter parsing"
```

---

### Task 2: Create sample MDX content file

**Files:**

- Create: `src/content/projects/sample-project.mdx`

This file is needed for all subsequent development and testing.

- [ ] **Step 1: Create sample MDX file**

```mdx
---
title: 'Sample Project'
description: 'A sample project for development and testing'
tags: ['React', 'TypeScript']
imageUrl: null
projectUrl: 'https://github.com/example/sample'
publishedAt: '2025-06-15'
featured: true
---

## Overview

This is a sample project used during development. Replace it with real content.

### Key Features

- Feature one
- Feature two
- Feature three
```

- [ ] **Step 2: Commit**

```bash
git add src/content/projects/sample-project.mdx
git commit -m "content: add sample project MDX file for development"
```

---

### Task 3: Rewrite mdx.server.ts with gray-matter + Zod

**Files:**

- Modify: `src/lib/mdx.server.ts`

This task replaces the entire contents of `mdx.server.ts`. The existing hand-rolled frontmatter parser, `ProjectFrontmatter`/`Project` types, and all existing functions (`getProjects`, `getProjectBySlug`, `getFeaturedProjects`, `getProjectsByTag`) are replaced wholesale.

**Current file anatomy (for the implementer):** The file exports types `ProjectFrontmatter` and `Project`, internal helpers `parseFrontmatter` and `validateFrontmatter`, and four async functions. None of these are imported anywhere in the codebase — the live routes use `src/server-fns/showcases.ts` instead. So replacing everything is safe.

- [ ] **Step 1: Write the new mdx.server.ts**

Replace the entire file contents with:

```typescript
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import matter from 'gray-matter'
import { z } from 'zod'

// --- Types ---

const ShowcaseFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  imageUrl: z.string().nullable().optional().default(null),
  projectUrl: z.string().url().nullable().optional().default(null),
  publishedAt: z.string().nullable().optional().default(null),
  featured: z.boolean().default(false),
})

export interface ShowcaseMeta {
  slug: string
  title: string
  description: string
  tags: string[]
  imageUrl: string | null
  projectUrl: string | null
  publishedAt: string | null
  featured: boolean
}

export interface Showcase extends ShowcaseMeta {
  content: string
}

// --- Constants ---

const PROJECTS_DIR = join(process.cwd(), 'src', 'content', 'projects')
const SLUG_PATTERN = /^[a-z0-9\-_]+$/i

// --- Functions ---

export async function getShowcases(): Promise<ShowcaseMeta[]> {
  let files: string[]
  try {
    files = await readdir(PROJECTS_DIR)
  } catch {
    return []
  }

  const mdxFiles = files.filter((f) => f.endsWith('.mdx'))
  const results: ShowcaseMeta[] = []

  for (const file of mdxFiles) {
    try {
      const raw = await readFile(join(PROJECTS_DIR, file), 'utf-8')
      const { data } = matter(raw)
      const parsed = ShowcaseFrontmatterSchema.parse(data)
      const slug = file.replace(/\.mdx$/, '')
      results.push({ slug, ...parsed })
    } catch (err) {
      console.error(`Skipping ${file}: ${err}`)
    }
  }

  return results.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    if (!a.publishedAt && !b.publishedAt) return 0
    if (!a.publishedAt) return 1
    if (!b.publishedAt) return -1
    return b.publishedAt.localeCompare(a.publishedAt)
  })
}

export async function getShowcase(slug: string): Promise<Showcase | null> {
  if (!SLUG_PATTERN.test(slug)) return null

  let raw: string
  try {
    raw = await readFile(join(PROJECTS_DIR, `${slug}.mdx`), 'utf-8')
  } catch {
    return null
  }

  const { data, content } = matter(raw)
  const parsed = ShowcaseFrontmatterSchema.parse(data)
  return { slug, ...parsed, content: content.trim() }
}

export async function getFeaturedShowcases(): Promise<ShowcaseMeta[]> {
  const all = await getShowcases()
  return all.filter((s) => s.featured)
}
```

- [ ] **Step 2: Verify the module loads without errors**

```bash
pnpm exec tsx -e "import('./src/lib/mdx.server.ts').then(m => m.getShowcases().then(r => console.log(JSON.stringify(r, null, 2))))"
```

Expected: JSON array containing the sample project metadata.

- [ ] **Step 3: Verify getShowcase returns content**

```bash
pnpm exec tsx -e "import('./src/lib/mdx.server.ts').then(m => m.getShowcase('sample-project').then(r => console.log(JSON.stringify(r, null, 2))))"
```

Expected: JSON object with `slug`, `title`, `content` (markdown body), etc.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mdx.server.ts
git commit -m "feat: rewrite mdx.server.ts with gray-matter and Zod validation"
```

---

### Task 4: Extract shared MarkdownContent component

**Files:**

- Create: `src/components/shared/MarkdownContent.tsx`
- Modify: `src/routes/blog/$slug.tsx`

Extract the `processContent`, `processInlineMarkdown` functions and `BlogContent` component from `src/routes/blog/$slug.tsx` into a shared `MarkdownContent` component. Then update the blog to import from the shared location.

**Current blog/$slug.tsx anatomy (for the implementer):** The file contains two internal functions (`processInlineMarkdown` and `processContent`) and a `BlogContent` component that calls `processContent`. These are defined inline in the route file, not exported. The content area wraps `BlogContent` in an `<article className="prose prose-invert max-w-none ...">` tag.

- [ ] **Step 1: Read blog/$slug.tsx to identify exact functions to extract**

Read `src/routes/blog/$slug.tsx` fully. Identify the exact `processInlineMarkdown`, `processContent`, and `BlogContent` function bodies.

- [ ] **Step 2: Create MarkdownContent.tsx**

Create `src/components/shared/MarkdownContent.tsx` containing:

- The `processInlineMarkdown` function (copy verbatim from blog/$slug.tsx)
- The `processContent` function (copy verbatim from blog/$slug.tsx)
- A `MarkdownContent` component (renamed from `BlogContent`) that accepts `{ content: string }` and renders `processContent(content)`

The component should NOT include the `<article className="prose ...">` wrapper — that stays in the consuming route so each page can customize prose styling.

```typescript
// Structure:
function processInlineMarkdown(text: string): string { /* copy from blog */ }
function processContent(content: string): React.ReactNode[] { /* copy from blog */ }

export function MarkdownContent({ content }: { content: string }) {
  const elements = processContent(content)
  return <>{elements}</>
}
```

- [ ] **Step 3: Update blog/$slug.tsx to import MarkdownContent**

In `src/routes/blog/$slug.tsx`:

- Remove the `processInlineMarkdown`, `processContent`, and `BlogContent` function definitions
- Add `import { MarkdownContent } from '@/components/shared/MarkdownContent'`
- Replace `<BlogContent content={post.content} />` with `<MarkdownContent content={post.content} />`

- [ ] **Step 4: Verify the blog still renders correctly**

```bash
pnpm build
```

Expected: Build succeeds with no errors. (Full runtime verification requires the dev server + a blog post, but a clean build confirms imports resolve.)

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/MarkdownContent.tsx src/routes/blog/\$slug.tsx
git commit -m "refactor: extract shared MarkdownContent component from blog"
```

---

### Task 5: Update ProjectCard to accept ShowcaseMeta

**Files:**

- Modify: `src/components/work/ProjectCard.tsx`

**Current anatomy:** Imports `Showcase` from `@/lib/wallow/types`. Destructures `{ id, title, tags, imageUrl, description, publishedAt }`. Uses `params={{ slug: id }}` for the Link.

- [ ] **Step 1: Update ProjectCard**

In `src/components/work/ProjectCard.tsx`:

- Change import from `import type { Showcase } from '@/lib/wallow/types'` to `import type { ShowcaseMeta } from '@/lib/mdx.server'`
- Change `ProjectCardProps` interface from `showcase: Showcase` to `showcase: ShowcaseMeta`
- Change destructuring from `{ id, title, tags, imageUrl, description, publishedAt }` to `{ slug, title, tags, imageUrl, description, publishedAt }`
- Change Link `params={{ slug: id }}` to `params={{ slug }}`

- [ ] **Step 2: Commit**

```bash
git add src/components/work/ProjectCard.tsx
git commit -m "refactor: update ProjectCard to accept ShowcaseMeta with slug"
```

---

### Task 6: Update FeaturedWork to accept ShowcaseMeta[]

**Files:**

- Modify: `src/components/home/FeaturedWork.tsx`

**Current anatomy:** Imports `Showcase` from `@/lib/wallow/types`. Uses `showcase.id` for keys and Link params.

- [ ] **Step 1: Update FeaturedWork**

In `src/components/home/FeaturedWork.tsx`:

- Change import from `import type { Showcase } from '@/lib/wallow/types'` to `import type { ShowcaseMeta } from '@/lib/mdx.server'`
- Change `FeaturedWorkProps` from `showcases: Showcase[]` to `showcases: ShowcaseMeta[]`
- Change all `showcase.id` references to `showcase.slug` — this includes:
  - `key={showcase.id}` → `key={showcase.slug}`
  - `params={{ slug: showcase.id }}` → `params={{ slug: showcase.slug }}`

- [ ] **Step 2: Commit**

```bash
git add src/components/home/FeaturedWork.tsx
git commit -m "refactor: update FeaturedWork to accept ShowcaseMeta with slug"
```

---

### Task 7: Wire routes to MDX utilities

**Files:**

- Modify: `src/routes/work/index.tsx`
- Modify: `src/routes/work/$slug.tsx`
- Modify: `src/routes/index.tsx`

This is the switchover task. After this, the app reads from MDX files instead of Wallow.

- [ ] **Step 1: Update work/index.tsx (gallery)**

In `src/routes/work/index.tsx`:

- Replace `import { fetchShowcases } from '@/server-fns/showcases'` with `import { getShowcases } from '@/lib/mdx.server'`
- Replace `import type { Showcase } from '@/lib/wallow/types'` with `import type { ShowcaseMeta } from '@/lib/mdx.server'`
- In the loader function, replace `const showcases = await fetchShowcases()` (or however it's called) with `const showcases = await getShowcases()`
  - Remove any try/catch around the fetch — `getShowcases()` already handles errors gracefully by returning `[]`
- Update type annotations from `Showcase` to `ShowcaseMeta` if any exist in the component body
- Change `key={showcase.id}` to `key={showcase.slug}` in the JSX where `ProjectCard` is rendered

- [ ] **Step 2: Update work/$slug.tsx (detail)**

In `src/routes/work/$slug.tsx`:

- Replace `import { fetchShowcase } from '@/server-fns/showcases'` with `import { getShowcase } from '@/lib/mdx.server'`
- Add `import { MarkdownContent } from '@/components/shared/MarkdownContent'`
- In the loader, replace `fetchShowcase({ data: params.slug })` with `getShowcase(params.slug)`
  - `getShowcase` returns `Showcase | null` — the existing `notFound()` guard on null stays
- Add a content rendering section in the JSX, after the hero/metadata area and before any footer navigation:

```tsx
{
  showcase.content && (
    <article className="prose prose-invert max-w-none prose-headings:text-text-primary prose-p:text-text-secondary prose-strong:text-text-primary prose-a:text-accent-primary">
      <MarkdownContent content={showcase.content} />
    </article>
  )
}
```

Use the same prose classes as the blog detail page (`src/routes/blog/$slug.tsx`) for visual consistency.

- [ ] **Step 3: Update index.tsx (home)**

In `src/routes/index.tsx`:

- Replace `import { fetchShowcases } from '@/server-fns/showcases'` with `import { getFeaturedShowcases } from '@/lib/mdx.server'`
- In the loader, replace `const showcases = await fetchShowcases()` with `const showcases = await getFeaturedShowcases()`
- Pass the result to `<FeaturedWork showcases={showcases} />`
  - Note: currently the home page passes ALL showcases. The spec says to use `getFeaturedShowcases()` which pre-filters for `featured: true`.

- [ ] **Step 4: Verify the app builds**

```bash
pnpm build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/work/index.tsx src/routes/work/\$slug.tsx src/routes/index.tsx
git commit -m "feat: wire routes to MDX showcases instead of Wallow API"
```

---

### Task 8: Cleanup — remove Wallow showcase integration

**Files:**

- Delete: `src/server-fns/showcases.ts`
- Modify: `src/lib/wallow/types.ts`

- [ ] **Step 1: Delete the showcase server functions**

Delete `src/server-fns/showcases.ts` entirely.

- [ ] **Step 2: Remove Showcase type from wallow/types.ts**

In `src/lib/wallow/types.ts`, remove the `Showcase` interface. Leave all other types untouched.

- [ ] **Step 3: Search for any remaining references**

Search the entire `src/` directory for any remaining imports or references to:

- `fetchShowcases` or `fetchShowcase`
- `Showcase` from `@/lib/wallow/types`
- `server-fns/showcases`
- `showcases.read` or `showcases.manage` (OIDC scope references — spec says to remove these if present)

Expected: Zero results. If any remain, update them.

- [ ] **Step 4: Verify clean build**

```bash
pnpm build
```

Expected: Clean build with no errors.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "chore: remove Wallow showcase integration"
```

---

### Task 9: Final verification

- [ ] **Step 1: Start dev server and verify all three routes**

```bash
pnpm dev
```

Manually verify (or use the browser agent):

1. `http://localhost:3000/` — home page shows the sample project in the FeaturedWork carousel
2. `http://localhost:3000/work` — gallery shows the sample project card
3. `http://localhost:3000/work/sample-project` — detail page shows metadata and rendered markdown body

- [ ] **Step 2: Verify blog still works**

Visit `http://localhost:3000/blog` and a blog post detail page. Confirm the MarkdownContent extraction didn't break blog rendering.

- [ ] **Step 3: Final commit if any fixes were needed**

If any fixes were applied during verification, commit them.
