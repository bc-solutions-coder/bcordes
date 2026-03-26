# Green-on-White Theme Migration

**Date:** 2026-03-20
**Status:** Draft
**Reference Mockup:** `docs/homepage-variations/22-green-on-white.html`

## Summary

Replace the current dark-mode-only theme with an accessible green-on-white light theme across the entire site. The homepage is redesigned to closely match the mockup; other pages inherit the new palette and typography with layouts unchanged for now.

## Decisions

- **Full replacement** — no dark mode toggle, no dual-theme support
- **Fonts** — Inter (body) + Outfit (headings) via Google Fonts
- **Design fidelity** — match mockup closely: clean cards with left borders, pill tags, simple hover lifts, no glow blobs
- **Other pages** — inherit palette + typography globally; individual page redesigns deferred
- **Hero graphic** — BC Solutions SVG logo centered in geometric circles with gentle orbit animation (enhancement beyond the mockup's static circles)

## Design Tokens

Replace all `:root` CSS variables in `src/styles.css`.

### Backgrounds

| Variable                 | Value     | Usage                                               |
| ------------------------ | --------- | --------------------------------------------------- |
| `--background-primary`   | `#ffffff` | Page background                                     |
| `--background-secondary` | `#f0f9ec` | Green-tinted section backgrounds (services, skills) |
| `--background-tertiary`  | `#fafafa` | Subtle lift surfaces                                |

### Text

| Variable           | Value     | Contrast   | Usage                    |
| ------------------ | --------- | ---------- | ------------------------ |
| `--text-primary`   | `#1a1a1a` | 17.4:1 AAA | Headings, primary labels |
| `--text-secondary` | `#4a4a4a` | 9.7:1 AAA  | Body text, descriptions  |
| `--text-tertiary`  | `#737373` | 4.6:1 AA   | Meta info, placeholders  |

### Green Accent (Accessible)

| Variable              | Value     | Contrast        | Usage                          |
| --------------------- | --------- | --------------- | ------------------------------ |
| `--accent-primary`    | `#2a6b22` | 6.5:1 AA        | Buttons, links, stat numbers   |
| `--accent-secondary`  | `#3d8b37` | 4.25:1 AA large | Large text accents only        |
| `--accent-tertiary`   | `#1e5218` | 8.8:1 AAA       | Hover/pressed button states    |
| `--accent-decorative` | `#6BBF59` | —               | Non-text: borders, icons, dots |
| `--accent-light`      | `#f0f9ec` | —               | Badge/tag backgrounds          |
| `--accent-mid`        | `#dcefd4` | —               | Gradient endpoints             |

### Borders

| Variable           | Value                  | Usage                    |
| ------------------ | ---------------------- | ------------------------ |
| `--border-default` | `#e5e5e5`              | Cards, inputs, dividers  |
| `--border-accent`  | `rgb(61 139 55 / 0.3)` | Hover/focus green border |

### Additional

| Variable       | Value     | Usage                  |
| -------------- | --------- | ---------------------- |
| `--focus-ring` | `#2a6b22` | Focus-visible outlines |
| `--gray-50`    | `#fafafa` | Subtle background      |
| `--gray-100`   | `#f5f5f5` | Tag backgrounds        |
| `--gray-200`   | `#e5e5e5` | Borders                |

### Tailwind `@theme inline` Mappings

All new tokens must be added to the `@theme inline` block so Tailwind utility classes work:

```css
--color-accent-decorative: var(--accent-decorative);
--color-accent-light: var(--accent-light);
--color-accent-mid: var(--accent-mid);
--color-focus-ring: var(--focus-ring);
--color-gray-50: var(--gray-50);
--color-gray-100: var(--gray-100);
--color-gray-200: var(--gray-200);
```

### shadcn/ui Variables (oklch)

Full replacement values for the light theme:

```css
--background: oklch(1 0 0); /* #ffffff */
--foreground: oklch(0.145 0 0); /* near-black */
--card: oklch(1 0 0); /* white */
--card-foreground: oklch(0.145 0 0); /* near-black */
--popover: oklch(1 0 0); /* white */
--popover-foreground: oklch(0.145 0 0); /* near-black */
--primary: oklch(0.39 0.11 142); /* #2a6b22 */
--primary-foreground: oklch(1 0 0); /* white */
--secondary: oklch(0.96 0.02 142); /* light green-gray */
--secondary-foreground: oklch(0.145 0 0); /* near-black */
--muted: oklch(0.96 0 0); /* #f5f5f5 */
--muted-foreground: oklch(0.556 0 0); /* #737373 */
--accent: oklch(0.96 0.02 142); /* light green tint */
--accent-foreground: oklch(0.145 0 0); /* near-black */
--destructive: oklch(0.577 0.245 27.325); /* red for light bg */
--border: oklch(0.922 0 0); /* #e5e5e5 */
--input: oklch(0.922 0 0); /* #e5e5e5 */
--ring: oklch(0.39 0.11 142); /* matches --primary */
--sidebar-background: oklch(0.985 0 0); /* near-white */
--sidebar-foreground: oklch(0.145 0 0); /* near-black */
--sidebar-primary: oklch(0.39 0.11 142); /* green */
--sidebar-primary-foreground: oklch(1 0 0); /* white */
--sidebar-accent: oklch(0.96 0.02 142); /* light green */
--sidebar-accent-foreground: oklch(0.145 0 0); /* near-black */
--sidebar-border: oklch(0.922 0 0); /* #e5e5e5 */
--sidebar-ring: oklch(0.39 0.11 142); /* green */
```

## Typography

### Font Loading

Add Google Fonts via `<link>` in the root document `__root.tsx`:

```
Inter: weights 400, 500, 600, 700
Outfit: weights 600, 700, 800
```

Use `rel="preconnect"` for `fonts.googleapis.com` and `fonts.gstatic.com`.

### Application

- `body` — `font-family: 'Inter', sans-serif`
- `h1, h2, h3, h4` — `font-family: 'Outfit', sans-serif; line-height: 1.15`

## Component Changes

### Root Document (`__root.tsx`)

- Remove `colorScheme: 'dark'` and `backgroundColor: '#0a0a0a'` from `<html>`
- Remove dark loading overlay inline styles
- Update theme-color meta tag to `#2a6b22`
- Add Google Fonts preconnect + stylesheet links
- Run `pnpm remove next-themes` (unused dependency)

### Header (`src/components/layout/Header.tsx`)

- Background: white with blur backdrop (`rgba(255,255,255,0.92)`)
- Border: bottom `1px solid var(--border-default)`
- Scroll shadow: `0 1px 8px rgba(0,0,0,0.06)` on scroll
- Nav links: `var(--text-secondary)`, hover `var(--accent-primary)`
- CTA button: `bg-accent-primary text-white`, hover `bg-accent-tertiary`
- Logo: SVG + "BC Solutions" in Outfit bold

### Footer (`src/components/layout/Footer.tsx`)

Keep existing three-column layout (brand, navigation links, social icons) but restyle:

- Background: `var(--text-primary)` (`#1a1a1a`) — dark footer
- Text: `rgba(255,255,255,0.7)`
- Links: `#a8e6a0` with underline
- Separator and bottom copyright row preserved

### Hero (`src/components/home/Hero.tsx`)

Complete redesign:

- **Layout**: Two-column grid (content left, graphic right)
- **Badge**: Green-light bg with pulsing dot, "Available for Projects"
- **Heading**: Plain `<h1>` with Outfit 800 (remove `AnimatedText` wrapper — the word-stagger animation conflicts with the `::after` underline on the accent `<span>`)
- **CTA buttons**: Primary (green filled) + Secondary (white outlined)
- **Stats**: Row of stat counters with green numbers (Outfit 700)
- **Graphic**: Geometric circle composition with:
  - BC Solutions SVG logo centered
  - Two concentric circle rings rotating slowly in opposite directions (20s and 15s) — this is an enhancement beyond the mockup, which uses static circles
  - Floating green dots with `animation: float 6s ease-in-out infinite`
  - All animation respects `prefers-reduced-motion`

### Services (`src/components/home/ServicesGrid.tsx`)

- Section background: `var(--background-secondary)` (green tint)
- Section label: uppercase, small, green text
- Cards: white bg, `border-radius: 14px`, `border-left: 4px solid var(--accent-decorative)`
- Icon: 48px circle with green-light bg, green stroke icon
- Tech tags: pill badges with `var(--accent-light)` bg, `var(--accent-tertiary)` text
- Hover: lift (`translateY(-2px)`) + box shadow

### Featured Work (`src/components/home/FeaturedWork.tsx`)

- Replace Embla carousel with 2-column card grid
- Cards: white bg, left green border, same style as services
- Meta row: year badge (green pill) + type label
- Tech tags: gray bg pills (`var(--gray-100)`)
- Hover: lift + shadow

### Skills (`src/components/home/SkillsShowcase.tsx`)

- Section background: `var(--background-secondary)` (green tint)
- 4-column grid of skill groups
- Category heading with green bar (`::before` pseudo-element)
- Skill pills: white bg, `1.5px border var(--border-default)`, rounded
- Hover: green border, green-light bg, green text

### Contact Section (homepage CTA)

- Centered text with green CTA button
- Clean, minimal — matches mockup's contact section

### Shared Components

**FadeInView** — keep as-is, works with any color scheme

**Cards/Badges across other pages** — will automatically inherit new token values:

- `ProjectCard`: border colors, hover effects update via tokens
- `ProjectFilter`: active state uses `bg-accent-primary`
- `ContactForm`: input borders and focus states update via tokens
- Admin dashboard: inherits new palette

### MDX Showcase Content (`src/styles.css` `.showcase-content` block)

- Code block backgrounds (`var(--background-tertiary)` = `#fafafa`) will need slightly more contrast on white — consider adding a border or using `var(--gray-100)`
- Links in `.showcase-content a` currently use `--accent-secondary` (4.25:1, AA large only) — switch to `--accent-primary` (`#2a6b22`, 6.5:1 AA) for accessible normal-text link contrast

## Removals

- Radial green glow blobs (`bg-accent-primary/10 blur-[120px]`) from Hero and About
- `bg-gradient-to-b from-background-primary via-background-secondary` dark gradients
- Image overlay gradients (`from-background-primary/80`)
- `animate-ping` on status dots (replace with simple CSS pulse)
- `next-themes` package (unused) — `pnpm remove next-themes`
- Dark-specific inline styles in `__root.tsx`
- `--accent-info` and `--accent-warning` tokens (unused in any component)
- All uses of `border-border-subtle` (undefined token, latent bug) — replaced during card restyling
- `AnimatedText` wrapper from Hero heading (replaced with plain `<h1>` + accent `<span>`)

## Accessibility

- All text-on-white combinations meet WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
- `--accent-secondary` (`#3d8b37`, 4.25:1) restricted to large text only; normal-text links use `--accent-primary` (`#2a6b22`, 6.5:1)
- `--accent-decorative` (`#6BBF59`) used only for non-text elements (borders, dots, icons)
- Focus ring: `3px solid var(--focus-ring)` with `2px offset`
- Skip-to-content link preserved
- `prefers-reduced-motion` disables all animations
- All `aria-label`, `aria-hidden`, and `role` attributes preserved from mockup

## Files Changed

| File                                     | Change Type                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/styles.css`                         | Major — replace all tokens, `@theme inline` mappings, font declarations, showcase content styles |
| `src/routes/__root.tsx`                  | Moderate — remove dark styles, add font links                                                    |
| `src/components/home/Hero.tsx`           | Major — complete redesign                                                                        |
| `src/components/home/ServicesGrid.tsx`   | Moderate — restyle cards                                                                         |
| `src/components/home/FeaturedWork.tsx`   | Major — carousel → grid                                                                          |
| `src/components/home/SkillsShowcase.tsx` | Moderate — restyle pills                                                                         |
| `src/components/layout/Header.tsx`       | Moderate — light theme nav                                                                       |
| `src/components/layout/Footer.tsx`       | Moderate — restyle with dark bg, keep layout                                                     |
| `src/components/layout/MobileNav.tsx`    | Minor — verify token inheritance on light bg                                                     |
| `src/components/shared/FadeInView.tsx`   | None — works as-is                                                                               |
| `package.json`                           | Minor — remove `next-themes`                                                                     |
