# Website Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the BC Solutions portfolio site with a stacked-sections layout and an expandable bento grid for project showcases.

**Architecture:** Replace the current carousel-based homepage with stacked sections (hero, services, bento showcase, about teaser, contact CTA). The bento grid uses Framer Motion layout animations for smooth expand/collapse. Showcases come from the Wallow API — no backend changes needed.

**Tech Stack:** TanStack Start, React 19, Tailwind CSS v4, Framer Motion, Radix UI, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-19-website-redesign-design.md`

---

### Task 1: Install framer-motion

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install framer-motion**

Run: `pnpm add framer-motion`

- [ ] **Step 2: Verify the build still works**

Run: `pnpm build`
Expected: Build succeeds

Note: `embla-carousel-react` and `next-themes` will be removed in Task 9 (cleanup) **after** the components that import them have been rewritten. Removing them now would break the build since `FeaturedWork.tsx` still imports the carousel.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add framer-motion"
```

---

### Task 2: Update design tokens and global styles

**Files:**

- Modify: `src/styles.css`
- Modify: `src/lib/design-tokens.ts`

- [ ] **Step 1: Update CSS custom properties in styles.css**

Replace the existing color variables in the `:root` / `@theme` section with the new palette from the spec. Key changes:

| Variable                 | New Value |
| ------------------------ | --------- |
| `--color-bg-primary`     | `#0a0a0a` |
| `--color-bg-secondary`   | `#111111` |
| `--color-bg-tertiary`    | `#1a1a1a` |
| `--color-text-primary`   | `#e5e5e5` |
| `--color-text-secondary` | `#a3a3a3` |
| `--color-text-tertiary`  | `#525252` |
| `--color-accent`         | `#10b981` |
| `--color-accent-hover`   | `#059669` |
| `--color-border-default` | `#1e1e1e` |
| `--color-border-hover`   | `#333333` |

Ensure these are registered via Tailwind v4's `@theme` so they work as `bg-(--color-bg-primary)` etc.

- [ ] **Step 2: Update design-tokens.ts to match**

Update the TypeScript constants in `src/lib/design-tokens.ts` to match the new CSS variable values.

- [ ] **Step 3: Verify styles compile**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/styles.css src/lib/design-tokens.ts
git commit -m "style: update design tokens for redesign"
```

---

### Task 3: Create the BentoGrid and BentoCard components

This is the core of the redesign. Create the bento grid with Framer Motion layout animations.

**Files:**

- Create: `src/components/work/BentoGrid.tsx`
- Create: `src/components/work/BentoCard.tsx`
- Create: `src/components/work/BentoCardExpanded.tsx`
- Create: `src/components/work/bento-colors.ts`

- [ ] **Step 1: Create the color palette config**

Create `src/components/work/bento-colors.ts`:

```typescript
/** Gradient pairs for bento cards. Assigned by index (modulo length). */
export const SHOWCASE_COLORS: [string, string][] = [
  ['#1e3a5f', '#0ea5e9'], // blue
  ['#1a3a2a', '#10b981'], // green
  ['#2d1b4e', '#7c3aed'], // purple
  ['#3b1a1a', '#ef4444'], // red
  ['#1a2a3d', '#3b82f6'], // indigo
  ['#2a2a1a', '#f59e0b'], // amber
  ['#1a2e2e', '#14b8a6'], // teal
  ['#2e1a2e', '#ec4899'], // pink
]

export const DEFAULT_GRADIENT: [string, string] = ['#1a1a1a', '#2a2a2a']

export function getShowcaseGradient(index: number): [string, string] {
  return SHOWCASE_COLORS[index % SHOWCASE_COLORS.length] ?? DEFAULT_GRADIENT
}
```

- [ ] **Step 2: Create BentoCardExpanded component**

Create `src/components/work/BentoCardExpanded.tsx`. This is the content revealed when a card is expanded:

```tsx
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import type { Showcase } from '~/lib/wallow/types'

interface BentoCardExpandedProps {
  showcase: Showcase
}

export function BentoCardExpanded({ showcase }: BentoCardExpandedProps) {
  const items = [
    // Image
    showcase.imageUrl && (
      <motion.div
        key="image"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        className="overflow-hidden rounded-lg"
      >
        <img
          src={showcase.imageUrl}
          alt={showcase.title}
          className="h-auto w-full rounded-lg object-cover"
        />
      </motion.div>
    ),
    // Description
    <motion.p
      key="desc"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="text-sm leading-relaxed text-white/60"
    >
      {showcase.description}
    </motion.p>,
    // Tags
    <motion.div
      key="tags"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-wrap gap-2"
    >
      {showcase.tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/80"
        >
          {tag}
        </span>
      ))}
    </motion.div>,
    // Project link
    showcase.projectUrl && (
      <motion.div
        key="link"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <a
          href={showcase.projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-xs text-white transition-colors hover:bg-white/10"
        >
          <ExternalLink className="h-3 w-3" />
          View Project
        </a>
      </motion.div>
    ),
  ].filter((item): item is React.ReactElement => Boolean(item))

  return <div className="mt-3 flex flex-col gap-3">{items}</div>
}
```

- [ ] **Step 3: Create BentoCard component**

Create `src/components/work/BentoCard.tsx`:

```tsx
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useRef, useEffect } from 'react'
import type { Showcase } from '~/lib/wallow/types'
import { BentoCardExpanded } from './BentoCardExpanded'

interface BentoCardProps {
  showcase: Showcase
  gradient: [string, string]
  isExpanded: boolean
  defaultSpan?: number
  onToggle: () => void
}

export function BentoCard({
  showcase,
  gradient,
  isExpanded,
  defaultSpan = 1,
  onToggle,
}: BentoCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const category = showcase.tags[0] ?? 'Project'

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }

  // Auto-scroll when expanded
  useEffect(() => {
    if (isExpanded && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const isFullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (!isFullyVisible) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [isExpanded])

  const handleClick = useCallback(() => {
    onToggle()
  }, [onToggle])

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggle()
    },
    [onToggle],
  )

  // Drive grid span via data attribute + CSS classes instead of inline style
  // to avoid Framer Motion FLIP snapshot conflicts with CSS Grid recalculation.
  // The grid span classes are defined in the BentoGrid container's CSS.
  const spanClass = isExpanded
    ? 'col-span-2 row-span-2'
    : defaultSpan === 2
      ? 'col-span-2 row-span-1'
      : 'col-span-1 row-span-1'

  return (
    <motion.div
      ref={ref}
      layout
      transition={transition}
      onClick={handleClick}
      className={`relative cursor-pointer overflow-hidden rounded-2xl p-5 ${spanClass} ${
        !isExpanded
          ? 'transition-transform duration-200 hover:z-10 hover:scale-[1.02]'
          : ''
      }`}
      style={{
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      }}
    >
      {/* Close button */}
      <AnimatePresence>
        {isExpanded && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Category label */}
      <motion.span
        layout="position"
        transition={transition}
        className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50"
      >
        {category}
      </motion.span>

      {/* Title */}
      <motion.h3
        layout="position"
        transition={transition}
        className={`font-bold text-white transition-[font-size] duration-300 ${
          isExpanded ? 'text-[28px]' : 'text-lg'
        }`}
      >
        {showcase.title}
      </motion.h3>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && <BentoCardExpanded showcase={showcase} />}
      </AnimatePresence>
    </motion.div>
  )
}
```

- [ ] **Step 4: Create BentoGrid container**

Create `src/components/work/BentoGrid.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react'
import { LayoutGroup } from 'framer-motion'
import type { Showcase } from '~/lib/wallow/types'
import { BentoCard } from './BentoCard'
import { getShowcaseGradient } from './bento-colors'

interface BentoGridProps {
  showcases: Showcase[]
  /** If set, auto-expand the card matching this slug on mount */
  initialExpandedSlug?: string
}

export function BentoGrid({ showcases, initialExpandedSlug }: BentoGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Auto-expand from URL hash
  useEffect(() => {
    if (initialExpandedSlug) {
      const match = showcases.find((s) => s.id === initialExpandedSlug)
      if (match) {
        requestAnimationFrame(() => {
          setExpandedId(match.id)
        })
      }
    }
  }, [initialExpandedSlug, showcases])

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <LayoutGroup>
      <div
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
        style={{ gridAutoRows: '180px' }}
      >
        {showcases.map((showcase, index) => (
          <BentoCard
            key={showcase.id}
            showcase={showcase}
            gradient={getShowcaseGradient(index)}
            isExpanded={expandedId === showcase.id}
            defaultSpan={index === 0 ? 2 : 1}
            onToggle={() => handleToggle(showcase.id)}
          />
        ))}
      </div>
    </LayoutGroup>
  )
}
```

- [ ] **Step 5: Verify components compile**

Run: `pnpm build`
Expected: Build succeeds (components aren't wired to routes yet, but should compile)

- [ ] **Step 6: Commit**

```bash
git add src/components/work/BentoGrid.tsx src/components/work/BentoCard.tsx src/components/work/BentoCardExpanded.tsx src/components/work/bento-colors.ts
git commit -m "feat: add BentoGrid, BentoCard, and BentoCardExpanded components"
```

---

### Task 4: Redesign the Hero component

**Files:**

- Modify: `src/components/home/Hero.tsx`

- [ ] **Step 1: Rewrite Hero.tsx**

Replace the current Hero with the new stacked/breathing design:

```tsx
import { FadeInView } from '~/components/shared/FadeInView'

export function Hero() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <FadeInView>
          <span className="mb-6 block text-[11px] uppercase tracking-[3px] text-[--color-text-tertiary]">
            BC Solutions · Denver, CO
          </span>
        </FadeInView>

        <FadeInView delay={100}>
          <h1 className="text-3xl font-light leading-tight text-[--color-text-primary] md:text-4xl">
            I build{' '}
            <strong className="font-semibold text-white">
              reliable software
            </strong>{' '}
            for teams that ship.
          </h1>
        </FadeInView>

        <FadeInView delay={200}>
          <div className="mt-5 h-[3px] w-10 bg-[--color-accent]" />
        </FadeInView>

        <FadeInView delay={300}>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[--color-text-secondary]">
            Full-stack development and consulting — from architecture to
            production.
          </p>
        </FadeInView>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev` and check http://localhost:3000
Expected: Clean hero with overline, headline, accent bar, subtitle. No glow effects, no animated text, no CTA buttons.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/Hero.tsx
git commit -m "style: redesign Hero with stacked breathing layout"
```

---

### Task 5: Redesign the ServicesGrid component

**Files:**

- Modify: `src/components/home/ServicesGrid.tsx`

- [ ] **Step 1: Read current ServicesGrid**

Read `src/components/home/ServicesGrid.tsx` to understand the current structure before rewriting.

- [ ] **Step 2: Rewrite ServicesGrid with clean card design**

Simplify to 3 cards with icon, title, brief description. No skill tags. Subtle border with hover transition. Include the section label (overline) matching the pattern used in other sections.

Key markup — section with label + cards:

```tsx
<section className="px-6 py-24">
  <div className="mx-auto max-w-[1200px]">
    <FadeInView>
      <span className="mb-6 block text-[11px] uppercase tracking-[3px] text-[--color-text-tertiary]">
        Services
      </span>
    </FadeInView>
    <FadeInView delay={100}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{/* cards */}</div>
    </FadeInView>
  </div>
</section>
```

Key markup per card:

```tsx
<div className="rounded-xl border border-[--color-border-default] bg-[--color-bg-secondary] p-6 transition-colors hover:border-[--color-border-hover]">
  <div className="mb-3 text-xl">{icon}</div>
  <h3 className="mb-1 text-sm font-semibold text-[--color-text-primary]">
    {title}
  </h3>
  <p className="text-xs text-[--color-text-tertiary]">{description}</p>
</div>
```

Keep the existing service data (titles, descriptions, icons). Just simplify the card styling.

- [ ] **Step 3: Verify it renders**

Run: `pnpm dev` and check homepage
Expected: 3 clean service cards, horizontal on desktop, stacked on mobile

- [ ] **Step 4: Commit**

```bash
git add src/components/home/ServicesGrid.tsx
git commit -m "style: simplify ServicesGrid to clean card design"
```

---

### Task 6: Replace FeaturedWork carousel with BentoGrid

**Files:**

- Modify: `src/components/home/FeaturedWork.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Rewrite FeaturedWork to use BentoGrid**

Replace the carousel-based FeaturedWork with a section that renders the BentoGrid:

```tsx
import { FadeInView } from '~/components/shared/FadeInView'
import { BentoGrid } from '~/components/work/BentoGrid'
import type { Showcase } from '~/lib/wallow/types'

interface FeaturedWorkProps {
  showcases: Showcase[]
}

export function FeaturedWork({ showcases }: FeaturedWorkProps) {
  if (showcases.length === 0) return null

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-[1200px]">
        <FadeInView>
          <span className="mb-3 block text-[11px] uppercase tracking-[3px] text-[--color-text-tertiary]">
            Featured Work
          </span>
        </FadeInView>
        {/* No FadeInView wrapping BentoGrid — it conflicts with
            Framer Motion layout FLIP coordinate snapshots.
            The section label above can use FadeInView, but the grid itself must not. */}
        <BentoGrid showcases={showcases} />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Remove SkillsShowcase from homepage, add About teaser and Contact CTA**

Update `src/routes/index.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { Hero } from '~/components/home/Hero'
import { ServicesGrid } from '~/components/home/ServicesGrid'
import { FeaturedWork } from '~/components/home/FeaturedWork'
import { FadeInView } from '~/components/shared/FadeInView'
import { fetchShowcases } from '~/server-fns/showcases'

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    try {
      const showcases = await fetchShowcases()
      return { showcases }
    } catch {
      return { showcases: [] }
    }
  },
})

function HomePage() {
  const { showcases } = Route.useLoaderData()

  return (
    <main>
      <Hero />
      <ServicesGrid />
      <FeaturedWork showcases={showcases} />

      {/* About teaser */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-[1200px]">
          <FadeInView>
            <span className="mb-3 block text-[11px] uppercase tracking-[3px] text-[--color-text-tertiary]">
              About
            </span>
            <p className="max-w-xl text-base leading-relaxed text-[--color-text-secondary]">
              I've spent the last several years building software that teams
              actually want to maintain. Based in Denver, working with clients
              everywhere.
            </p>
            <Link
              to="/about"
              className="mt-4 inline-block text-sm text-[--color-accent] transition-colors hover:text-[--color-accent-hover]"
            >
              Learn more →
            </Link>
          </FadeInView>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-[1200px]">
          <FadeInView>
            <h2 className="text-2xl font-light text-[--color-text-primary]">
              Have a project in mind?
            </h2>
            <Link
              to="/contact"
              className="mt-4 inline-block text-sm text-[--color-accent] transition-colors hover:text-[--color-accent-hover]"
            >
              Get in touch →
            </Link>
          </FadeInView>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Verify homepage renders end to end**

Run: `pnpm dev` and check http://localhost:3000
Expected: Hero → Services → Bento grid showcases → About teaser → Contact CTA. Clicking bento cards expands them with smooth animation.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/FeaturedWork.tsx src/routes/index.tsx
git commit -m "feat: replace carousel with BentoGrid on homepage"
```

---

### Task 7: Redesign the /work page with BentoGrid

**Files:**

- Modify: `src/routes/work/index.tsx`
- Modify: `src/routes/work/$slug.tsx`

- [ ] **Step 1: Rewrite /work page to use BentoGrid**

Replace the current grid + filter layout with a full BentoGrid. Keep tag filtering but simplify the UI:

```tsx
import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { fetchShowcases } from '@/server-fns/showcases'
import type { Showcase } from '@/lib/wallow/types'
import { BentoGrid } from '@/components/work/BentoGrid'
import { FadeInView } from '@/components/shared/FadeInView'

export const Route = createFileRoute('/work/')({
  component: WorkPage,
  loader: async () => {
    try {
      const showcases = await fetchShowcases()
      return { showcases }
    } catch {
      return { showcases: [] }
    }
  },
})

function WorkPage() {
  const { showcases } = Route.useLoaderData()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const tags = useMemo(() => {
    const tagSet = new Set<string>()
    showcases.forEach((s: Showcase) => s.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [showcases])

  const filtered = useMemo(() => {
    if (!selectedTag) return showcases
    return showcases.filter((s: Showcase) =>
      s.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()),
    )
  }, [showcases, selectedTag])

  // Read hash for auto-expand
  const hash =
    typeof window !== 'undefined' ? window.location.hash.slice(1) : undefined

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-[1200px]">
        <FadeInView>
          <h1 className="mb-2 text-3xl font-light text-[--color-text-primary] md:text-4xl">
            Work
          </h1>
          <p className="mb-8 text-base text-[--color-text-secondary]">
            A selection of projects across different industries and
            technologies.
          </p>
        </FadeInView>

        {/* Tag filters */}
        <FadeInView delay={100}>
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                selectedTag === null
                  ? 'bg-[--color-accent] text-white'
                  : 'border border-[--color-border-default] text-[--color-text-tertiary] hover:border-[--color-border-hover]'
              }`}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  selectedTag === tag
                    ? 'bg-[--color-accent] text-white'
                    : 'border border-[--color-border-default] text-[--color-text-tertiary] hover:border-[--color-border-hover]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </FadeInView>

        {/* No FadeInView wrapping BentoGrid here — it conflicts with
            Framer Motion layout animations + initialExpandedSlug auto-expand.
            The grid appears immediately; individual cards handle their own animation. */}
        <BentoGrid showcases={filtered} initialExpandedSlug={hash} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Convert /work/$slug to a redirect**

Replace `src/routes/work/$slug.tsx` with a server-side 301 redirect:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/work/$slug')({
  loader: ({ params }) => {
    throw redirect({
      to: '/work',
      hash: params.slug,
      statusCode: 301,
    })
  },
})
```

- [ ] **Step 3: Verify /work page and redirect**

Run: `pnpm dev`

- Check http://localhost:3000/work — bento grid with tag filters
- Check http://localhost:3000/work/some-id — should redirect to /work#some-id
  Expected: Both work correctly

- [ ] **Step 4: Commit**

```bash
git add src/routes/work/index.tsx src/routes/work/\$slug.tsx
git commit -m "feat: redesign /work page with BentoGrid, add slug redirect"
```

---

### Task 8: Simplify Header and Footer

**Files:**

- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Read current Header and Footer**

Read both files to understand current structure.

- [ ] **Step 2: Simplify Header**

Keep: sticky positioning, backdrop blur, logo left, nav links right, mobile nav toggle.
Remove: any theme toggle UI, complex hover effects.
Update: Use new design tokens. Simplify nav link styling to plain text with subtle hover color change.

- [ ] **Step 3: Simplify Footer**

Keep: brand info, nav links, social icons.
Remove: excessive columns, complex layouts.
Update: Use new design tokens. Simple 2-column layout (brand left, links right), separator line above.

- [ ] **Step 4: Verify header and footer render cleanly**

Run: `pnpm dev` and check across multiple pages.
Expected: Clean, minimal header/footer matching the new design language.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Footer.tsx
git commit -m "style: simplify Header and Footer for redesign"
```

---

### Task 9: Remove unused components, dependencies, and clean up

**Files:**

- Delete: `src/components/shared/AnimatedText.tsx`
- Delete: `src/components/home/SkillsShowcase.tsx`
- Delete: `src/components/work/ProjectCard.tsx` (replaced by BentoCard)
- Delete: `src/components/work/ProjectFilter.tsx` (replaced by inline tag filter on /work page)
- Delete: `src/components/ui/carousel.tsx` (no longer used after FeaturedWork rewrite)
- Modify: `src/routes/__root.tsx` (remove any next-themes references, set static dark class)
- Modify: `package.json` (remove embla-carousel-react and next-themes)

- [ ] **Step 1: Search for remaining references to removed components**

Search for imports of `AnimatedText`, `SkillsShowcase`, `ProjectCard`, `ProjectFilter`, `next-themes`, `useTheme`, `ThemeProvider`, and `Carousel`.

Run:

```bash
grep -r "AnimatedText\|SkillsShowcase\|ProjectCard\|ProjectFilter\|next-themes\|useTheme\|ThemeProvider\|carousel" src/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Delete dead component files**

Delete:

- `src/components/shared/AnimatedText.tsx`
- `src/components/home/SkillsShowcase.tsx`
- `src/components/work/ProjectCard.tsx`
- `src/components/work/ProjectFilter.tsx`
- `src/components/ui/carousel.tsx`

Remove any remaining imports of these in other files found in Step 1.

- [ ] **Step 3: Remove embla-carousel and next-themes packages**

Run: `pnpm remove embla-carousel-react next-themes`

- [ ] **Step 4: Clean up \_\_root.tsx**

Ensure `<html>` has `class="dark"` set statically. Remove any theme provider wrappers or useTheme calls if present. The root layout should be clean: just Header + main + Footer + Toaster.

- [ ] **Step 5: Verify build and no broken imports**

Run: `pnpm build`
Expected: Clean build with no import errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove dead components, embla-carousel, and next-themes"
```

---

### Task 10: Restyle remaining pages (about, contact, blog, resume)

**Files:**

- Modify: `src/routes/about.tsx`
- Modify: `src/routes/contact.tsx`
- Modify: `src/routes/blog/index.tsx`
- Modify: `src/routes/resume.tsx`

- [ ] **Step 1: Read each page to understand current structure**

Read all four route files.

- [ ] **Step 2: Restyle /about**

Apply stacked sections layout with breathing room. Keep existing content, update classes to use new design tokens. Apply the same section pattern: overline label → content → generous padding.

- [ ] **Step 3: Restyle /contact**

Keep the existing ContactForm component. Update wrapper styling to match new design tokens. Clean section layout with generous padding.

- [ ] **Step 4: Restyle /blog**

Simplify to clean list of posts with title + date + excerpt. Use new design tokens.

- [ ] **Step 5: Restyle /resume**

Clean typographic layout with new tokens. Keep content, update styling.

- [ ] **Step 6: Verify all pages**

Run: `pnpm dev` and visit each page.
Expected: All pages follow the stacked sections + breathing room pattern with consistent design tokens.

- [ ] **Step 7: Commit**

```bash
git add src/routes/about.tsx src/routes/contact.tsx src/routes/blog/index.tsx src/routes/resume.tsx
git commit -m "style: restyle about, contact, blog, and resume pages"
```

---

### Task 11: Final verification and build

**Files:** None (verification only)

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: Clean build, no errors, no warnings about missing imports

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: All existing tests pass

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: No lint errors

- [ ] **Step 4: Manual smoke test**

Start dev server and verify:

- [ ] Homepage: Hero → Services → Bento grid → About teaser → Contact CTA
- [ ] Bento card click expands with smooth Framer Motion animation
- [ ] Only one card expanded at a time
- [ ] Close button and re-click both collapse
- [ ] /work page: full bento grid with tag filters
- [ ] /work/some-id redirects to /work#some-id
- [ ] /about, /contact, /blog, /resume all render with new styling
- [ ] Header and footer are clean and consistent
- [ ] Mobile responsive: 2-col bento grid, stacked sections
- [ ] No console errors

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during final verification"
```
