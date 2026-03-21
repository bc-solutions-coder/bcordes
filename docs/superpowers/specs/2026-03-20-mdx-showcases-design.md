# MDX Showcases Design

Replace the Wallow API-driven showcase system with local MDX files. The project already has a content utility module at `src/lib/mdx.server.ts` and a `src/content/projects/` directory. This spec evolves that existing module, wires it into the routes (which currently call the Wallow API), and removes the Wallow showcase integration.

## Current State

- **Routes** (`/work`, `/work/$slug`, `/`) call `fetchShowcases()` / `fetchShowcase()` from `src/server-fns/showcases.ts`, which hit the Wallow API via service client.
- **Components** (`ProjectCard`, `FeaturedWork`) accept the Wallow `Showcase` type and use `showcase.id` for routing (`params={{ slug: id }}`) and React keys (`key={showcase.id}`).
- **`src/lib/mdx.server.ts`** already exists with `getProjects()`, `getProjectBySlug()`, `getFeaturedProjects()`, `getProjectsByTag()` and types `ProjectFrontmatter` / `Project` — but nothing uses it yet.
- **`src/content/projects/`** directory exists but is empty.
- **Blog pattern:** The blog (`src/lib/blog.server.ts`, `src/routes/blog/$slug.tsx`) returns `content: string` (raw markdown) through the loader and renders it client-side with a `BlogContent` component. Showcases follow this same pattern.

## Content Structure

Each showcase lives at `src/content/projects/<slug>.mdx`. The filename is the URL slug.

### Frontmatter Schema

Evolve the existing `ProjectFrontmatter` interface. Drop `client` and `year` (replaced by `publishedAt`). Rename `image` to `imageUrl`. Add `projectUrl`.

```yaml
---
title: "My Portfolio Site"
description: "Brief summary for cards and meta tags"
tags: ["React", "TypeScript", "Tailwind"]
imageUrl: "/images/projects/portfolio.png"
projectUrl: "https://github.com/user/repo"
publishedAt: "2025-06-15"
featured: true
---
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | Display title |
| `description` | string | yes | Card summary and meta description |
| `tags` | string[] | yes | Technology/category tags for filtering |
| `imageUrl` | string | no | Local path (`/images/...`) or external URL |
| `projectUrl` | string | no | Link to live project or repo |
| `publishedAt` | string (ISO date) | no | Determines year filter; undated items sort last |
| `featured` | boolean | no | Defaults to `false`; controls home page carousel |

### Zod Validation Schema

```typescript
const ShowcaseFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  imageUrl: z.string().nullable().optional().default(null),
  projectUrl: z.string().url().nullable().optional().default(null),
  publishedAt: z.string().nullable().optional().default(null),
  featured: z.boolean().default(false),
})
```

### Image Resolution

- Starts with `/` or `./` — local asset served from `public/`
- Otherwise — external URL, used as-is

### MDX Body

Everything below the frontmatter is the project detail content: paragraphs, images, code blocks, headings. Rendered client-side as markdown (same approach as the blog).

## Content Utility Layer

Evolve `src/lib/mdx.server.ts` (not a new module). Replace the hand-rolled YAML parser with `gray-matter` and the manual validation with the Zod schema above. `gray-matter` uses `js-yaml` internally, which handles all standard YAML — a clear improvement over the current regex parser that only supports single-line inline arrays.

These are plain async utility functions, not `createServerFn` wrappers. Route loaders call them directly since loaders already run server-side in TanStack Start.

### Types

```typescript
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
  content: string  // raw markdown body (rendered client-side)
}
```

These replace the existing `ProjectFrontmatter`/`Project` types in `mdx.server.ts` and the `Showcase` type in `src/lib/wallow/types.ts`.

The `content` field is a plain string (the raw MDX body text after frontmatter extraction). This is JSON-serializable and survives the TanStack Start SSR serialization boundary without issue, matching the blog's established pattern.

### Functions

**`getShowcases(): Promise<ShowcaseMeta[]>`**

- Reads all `.mdx` files from `src/content/projects/`
- Parses frontmatter with `gray-matter`, validates with Zod
- Returns metadata only (no body content)
- Sorts by featured first, then `publishedAt` descending; undated items sort last
- On individual file validation failure: logs `console.error` and skips the file (one bad file must not break the gallery)
- Returns empty array if the directory does not exist (preserves current ENOENT handling)

**`getShowcase(slug: string): Promise<Showcase | null>`**

- Validates slug format: must match `/^[a-z0-9-_]+$/i` — rejects any slug with `/`, `.`, or path traversal characters; returns `null` for invalid slugs
- Reads `src/content/projects/<slug>.mdx`
- Parses frontmatter with `gray-matter`, validates with Zod
- Returns metadata plus raw body content as a string
- Returns `null` if the file does not exist
- If the file exists but frontmatter validation fails: throws (callers expect `null` only for ENOENT, not for corrupt content)

**`getFeaturedShowcases(): Promise<ShowcaseMeta[]>`**

- Calls `getShowcases()` and filters for `featured: true`
- Used by the home page loader (convenience helper, same pattern as the existing `getFeaturedProjects()`)

**Remove:** `getProjectsByTag()` — unused, filtering happens client-side.

### Content Rendering

The detail page renders the raw markdown body client-side using the same `processContent` / `processInlineMarkdown` approach from the blog's `BlogContent` component. Extract this into a shared `MarkdownContent` component (or reuse `BlogContent` directly) to avoid duplication. Style with the same `prose prose-invert` classes the blog already uses.

## Route Changes

### Gallery (`/work/index.tsx`)

- Import `getShowcases` from `@/lib/mdx.server` instead of `fetchShowcases` from `@/server-fns/showcases`
- Loader calls `getShowcases()` directly (no `createServerFn` wrapper needed)
- Replace all `showcase.id` with `showcase.slug` — in `key` props and all other references
- Replace `Showcase` type annotation with `ShowcaseMeta`
- Year extraction stays the same: `new Date(showcase.publishedAt).getFullYear()`
- Filter logic unchanged

### Detail (`/work/$slug.tsx`)

- Import `getShowcase` from `@/lib/mdx.server` instead of `fetchShowcase` from `@/server-fns/showcases`
- Loader calls `getShowcase(params.slug)` directly (no `{ data: params.slug }` wrapper)
- Existing `notFound()` / `notFoundComponent` pattern stays as-is
- Add MDX body rendering: a `<MarkdownContent content={showcase.content} />` section between the hero image and footer navigation
- Style the content area with `prose prose-invert` classes, matching the blog detail page pattern in `blog/$slug.tsx`

### Home (`/index.tsx`)

- Import `getFeaturedShowcases` from `@/lib/mdx.server` instead of `fetchShowcases` from `@/server-fns/showcases`
- Loader calls `getFeaturedShowcases()` directly
- Pass result to `FeaturedWork`

## Component Updates

### `ProjectCard`

- Accept `ShowcaseMeta` instead of Wallow `Showcase`
- Change destructuring from `const { id, title, ... }` to `const { slug, title, ... }`
- Change `params={{ slug: id }}` to `params={{ slug }}`
- Parent components use `key={showcase.slug}` instead of `key={showcase.id}`

### `FeaturedWork`

- Accept `ShowcaseMeta[]` instead of Wallow `Showcase[]`
- Change `key={showcase.id}` to `key={showcase.slug}`
- Change `params={{ slug: showcase.id }}` to `params={{ slug: showcase.slug }}`
- All other carousel behavior stays the same

### `ProjectFilter`

- No changes (receives tags/years from parent, not showcase objects)

### New: `MarkdownContent` (shared component)

Extract the `BlogContent` / `processContent` / `processInlineMarkdown` functions from `blog/$slug.tsx` into a shared component at `src/components/shared/MarkdownContent.tsx`. Both the blog detail page and showcase detail page import it. This avoids duplicating the markdown rendering logic.

## Cleanup

### Frontend — Remove

- `src/server-fns/showcases.ts` — the Wallow API server functions
- `Showcase` type from `src/lib/wallow/types.ts`
- Old `ProjectFrontmatter` and `Project` types from `src/lib/mdx.server.ts` (replaced by new types)
- `getProjectsByTag()` from `src/lib/mdx.server.ts` (unused)
- Any `showcases.read` or `showcases.manage` scope references in OIDC configuration

### Frontend — Keep

- Service client, auth, and other server functions (contacts, analytics) — unchanged
- `@mdx-js/rollup` in package.json — currently installed but not wired into `vite.config.ts`; retain for potential future use

### Wallow API — Remove

- Showcases API endpoints, controllers, services, DTOs, and database entities

## Dependencies

### Install

```bash
pnpm add gray-matter
```

### Not Needed

- `@mdx-js/mdx` — not required; content is returned as a raw string and rendered client-side with markdown processing (same as the blog), not compiled to React components server-side
- `@mdx-js/react` — same reason

## Data Flow

```
src/content/projects/*.mdx
  │
  ├─ getShowcases()           →  Gallery (/work)        →  ProjectCard grid + filters
  │
  ├─ getFeaturedShowcases()   →  Home (/)               →  FeaturedWork carousel
  │
  └─ getShowcase()            →  Detail (/work/:slug)   →  Metadata header + MarkdownContent body
```

## Migration Notes

- Create `src/content/projects/` directory (already exists but empty) and add at least one sample `.mdx` file for development/testing
- The old `ProjectFrontmatter` fields `client` and `year` are retired; use `publishedAt` for year derivation
- The old `image` field is renamed to `imageUrl`
- No data migration from Wallow is needed — showcases will be authored fresh as MDX files
