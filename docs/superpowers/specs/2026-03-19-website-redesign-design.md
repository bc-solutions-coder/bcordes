# Website Redesign — Design Spec

## Overview

Complete visual redesign of the BC Solutions portfolio site. The new design uses a **stacked sections** layout with generous spacing for most of the site, and a **bento grid with expand-on-click** interaction for the project showcases. Dark theme with emerald green accent. The goal is a site that feels unique, personal, and professional — not like a generic SaaS template.

## Design Principles

- **Breathing room:** Generous padding between sections. Let content float in space rather than filling every pixel.
- **Quiet confidence:** No flashy animations or hero gimmicks. Clean typography, subtle hover states, calm transitions.
- **Color through showcases:** The bento grid project cards provide the color and visual energy. The rest of the site stays mostly monochrome with emerald green accents.
- **No separate project detail pages:** Everything about a project is accessible from the expanded bento card. The `/work/:slug` routes are removed; existing URLs redirect to `/work` with the corresponding card auto-expanded via URL hash (e.g., `/work#project-name`).

## Color Palette

Tokens are defined as CSS custom properties in `src/styles.css` via Tailwind v4's `@theme` directive. Usage in classes: `bg-(--color-bg-primary)`, `text-(--color-text-primary)`, etc.

| CSS Variable             | Value     | Usage                          |
| ------------------------ | --------- | ------------------------------ |
| `--color-bg-primary`     | `#0a0a0a` | Page background                |
| `--color-bg-secondary`   | `#111111` | Card/section backgrounds       |
| `--color-bg-tertiary`    | `#1a1a1a` | Elevated surfaces              |
| `--color-text-primary`   | `#e5e5e5` | Headings, primary text         |
| `--color-text-secondary` | `#a3a3a3` | Body text                      |
| `--color-text-tertiary`  | `#525252` | Labels, overlines, metadata    |
| `--color-accent`         | `#10b981` | Primary accent (emerald green) |
| `--color-accent-hover`   | `#059669` | Hover state for accent         |
| `--color-border-default` | `#1e1e1e` | Subtle borders                 |
| `--color-border-hover`   | `#333333` | Border hover states            |

## Typography

- **Font stack:** System fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- **Headings:** Light weight (300) for hero, semi-bold (600) for section heads
- **Body:** Regular weight, 14-16px, generous line-height (1.6-1.7)
- **Labels/overlines:** 10-11px, uppercase, letter-spacing 2-3px, tertiary color
- **Accent bar:** 40px wide, 3px tall emerald green bar used as a visual anchor below hero heading

## Page Layout

### Global

- **Max content width:** 1200px, centered
- **Section spacing:** 80-120px vertical padding between major sections
- **Header:** Sticky, minimal — logo left, nav links right, subtle bottom border. Backdrop blur on scroll.
- **Footer:** Simple 2-3 column layout, brand + nav + social links, separator line above

### Home Page Sections (top to bottom)

#### 1. Hero

- Overline: "BC Solutions · Denver, CO" (tertiary text, uppercase, letterspaced)
- Headline: Large (3xl-4xl), light weight. Key phrase in bold/white. Example: "I build **reliable software** for teams that ship."
- Accent bar (40px emerald line below headline)
- Subtitle: 1-2 sentences, secondary color, max-width ~500px
- No CTA buttons in the hero — the site structure speaks for itself

#### 2. Services

- Section label: uppercase, letterspaced, tertiary color
- 3 cards in a horizontal row (stack on mobile)
- Each card: subtle border, rounded corners (12px), icon + title + brief description
- Hover: border color transitions to `border-hover`
- Cards use `bg-secondary` background

#### 3. Showcases (Bento Grid)

See [Bento Grid Showcase](#bento-grid-showcase) section below.

#### 4. About Teaser

- Brief 2-3 sentence intro
- "Learn more →" link to /about
- Optional: small avatar/photo

#### 5. Contact CTA

- Simple section: "Have a project in mind?" heading
- Subtle card or just text with a "Get in touch →" link to /contact

### Other Pages

- **/work** — Full bento grid (all projects), same expand behavior as homepage showcase. Supports URL hash to auto-expand a specific card (e.g., `/work#project-name`). Auto-expand fires after the grid's initial render is complete (use a `useEffect` that waits one frame via `requestAnimationFrame`). If the hash doesn't match any card slug, do nothing (silent no-op).
- **/work/:slug** — **Removed.** Server-side 301 redirect to `/work#:slug` via `redirect()` in the route loader. This ensures crawlers and bookmarks resolve correctly without client JS.
- **/about** — Stacked sections: intro paragraph, experience timeline or highlights, tech stack
- **/contact** — Contact form (existing form components, restyled to match new design)
- **/blog** — Simple list of posts, minimal cards or just title + date + excerpt
- **/resume** — Clean typographic layout
- **/admin/messages** — Unchanged (internal tool, not public-facing)

## Bento Grid Showcase

### Default State

- CSS Grid: `grid-template-columns: repeat(4, 1fr)` with `grid-auto-rows: 180px`
- Gap: 12px
- Some cards span 2 columns by default (featured projects)
- Each card has:
  - Unique gradient background (each project gets its own color identity)
  - Project category label (10px, uppercase, letterspaced)
  - Project title (18px, bold, white)
  - Subtle background icon or image at low opacity
  - Rounded corners: 16px
  - Hover: slight scale (1.02), elevated z-index

### Expanded State (on click)

- Clicked card changes to `grid-column: span 2; grid-row: span 2` (regardless of its default span)
- **Animation approach:** Use Framer Motion's `layout` prop on each `BentoCard`. Each card gets `<motion.div layout transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>`. Framer Motion handles both the expanding card and reflowing siblings via FLIP. The grid container does not need animation.
- Add `framer-motion` as a dependency
- Expanded card reveals:
  - **App screenshot/image** at the top of the card (or as a background that becomes more visible)
  - **Description** (2-3 sentences about the project)
  - **Tech tags** (pill-shaped badges: React, .NET, Docker, etc.)
  - **GitHub link** (icon + "View Source")
  - **Live demo link** (icon + "Live Demo") — if available
  - **Close button** (top-right, circular, semi-transparent with backdrop blur)
- Title font size increases to ~28px
- **Content reveal:** Use Framer Motion `AnimatePresence` + `motion.div` with `initial={{ opacity: 0, y: 8 }}` / `animate={{ opacity: 1, y: 0 }}` for expanded content (not CSS max-height, to avoid conflicts with layout FLIP). Stagger children by 100ms using `transition={{ delay: 0.1 * index }}`.
- Clicking the card again or the close button collapses it
- Only one card can be expanded at a time (expanding another collapses the current one)
- Auto-scroll: Use `scrollIntoView({ behavior: 'smooth', block: 'center' })` only when the expanded card is not already fully visible in the viewport. Check with `IntersectionObserver` or `getBoundingClientRect` before scrolling.

### Responsive

- **Desktop (>1024px):** 4-column grid
- **Tablet (768-1024px):** 3-column grid, expanded cards still span 2
- **Mobile (<768px):** 2-column grid, expanded cards span full width (2 cols). Expansion pushes sibling cards down (grid row grows); no overlay. Content stacks vertically: image on top, then description, tags, and links below.

## Animations & Transitions

- **Bento expand/collapse:** Framer Motion layout transition: `{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }`
- **Card hover scale:** CSS `transition: transform 200ms ease`
- **Border color transitions:** CSS `transition: border-color 200ms ease`
- **Content reveal (expanded card internals):** Framer Motion `AnimatePresence`, 300ms opacity + y-translate, staggered by 100ms per child
- **Scroll-triggered fade-in:** Keep existing `FadeInView` component for sections entering viewport
- **Reduced motion:** All animations respect `prefers-reduced-motion` — instant transitions, no scale effects

## Component Changes

### New Components

- `BentoGrid` — Container managing the grid layout and expand state
- `BentoCard` — Individual project card with collapsed/expanded states
- `BentoCardExpanded` — Sub-component rendered inside `BentoCard` when expanded (`{isExpanded && <BentoCardExpanded ... />}`). Not a separate DOM element — it's a child that appears within the card's existing container.

### Modified Components

- `Hero` — Simplified: remove animated badges, gradient glows, animated text. Replace with clean overline + headline + accent bar + subtitle.
- `ServicesGrid` — Simplified: clean cards with icon + title + description, no skill tags
- `FeaturedWork` — Remove carousel, replace with `BentoGrid` showing featured subset
- `Header` — Keep sticky + backdrop blur, simplify nav styling
- `Footer` — Simplify to match new minimal aesthetic

### Removed

- `AnimatedText` — No longer needed (hero uses simple text)
- Carousel dependencies (embla-carousel) — Replaced by bento grid
- Hero gradient glows / ping animations — Removed
- `next-themes` — Remove entirely. The site is dark-only; no theme toggle needed. Remove the `ThemeProvider` wrapper, any toggle UI, and all `useTheme()` call sites. Set `<html class="dark">` statically in the root layout. Any components that referenced `useTheme()` should have their theme-conditional logic replaced with the dark variant only.

### Added Dependencies

- `framer-motion` — Used for FLIP-based layout animations in the bento grid

## Data Model

Showcases come from the **Wallow API** via `src/server-fns/showcases.ts`, not MDX files. The existing `Showcase` type (`src/lib/wallow/types.ts`) has: `id`, `title`, `description`, `tags`, `imageUrl`, `projectUrl`, `publishedAt`, `createdAt`, `updatedAt`.

The API does **not** have `color`, `category`, `githubUrl`, or `featured` fields. Handle these client-side:

- **Gradient colors:** Define a `SHOWCASE_COLORS` array of gradient pairs in a config file. Assign by index (showcase position in the list). This provides visual variety without backend changes.
- **Category label:** Derive from the first tag (e.g., `tags[0]`), or default to `"Project"`.
- **GitHub link:** The existing `projectUrl` field serves as the primary external link. Render as "View Project" (not separate GitHub/demo links) since the API has a single URL field.
- **Featured:** Show all showcases on the homepage (the current behavior). If filtering is needed later, use a slice (e.g., first 6).

No backend changes needed.

## What Stays the Same

- TanStack Start framework, server functions, routing
- Tailwind CSS v4 for styling
- Radix UI for accessible components (dialogs, navigation, etc.)
- Dark theme as the primary/only theme
- Contact form functionality and admin dashboard
- Auth flow (OIDC)
- SEO meta tags and structured data
- All existing pages/routes (just restyled)
