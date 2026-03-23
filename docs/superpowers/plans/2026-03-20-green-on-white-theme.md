# Green-on-White Theme Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark theme with an accessible green-on-white light theme across the entire site, redesigning homepage components to match the mockup.

**Architecture:** Update CSS design tokens and shadcn/ui variables in `src/styles.css`, update root document for light theme + Google Fonts, then restyle each component starting with shared layout (Header/Footer) and progressing through homepage sections (Hero, Services, FeaturedWork, Skills).

**Tech Stack:** React 19, Tailwind CSS v4, Google Fonts (Inter + Outfit), TanStack Router

**Spec:** `docs/superpowers/specs/2026-03-20-green-on-white-theme-design.md`
**Reference Mockup:** `docs/homepage-variations/22-green-on-white.html`

---

## File Map

| File                                     | Action  | Responsibility                                                                            |
| ---------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `src/styles.css`                         | Modify  | All CSS variables, `@theme inline` mappings, font declarations, showcase content link fix |
| `src/routes/__root.tsx`                  | Modify  | Remove dark inline styles, add Google Fonts links, update theme-color                     |
| `src/components/layout/Header.tsx`       | Modify  | Light theme nav: white bg, dark text, green CTA                                           |
| `src/components/layout/Footer.tsx`       | Modify  | Dark footer bg with light text, green links                                               |
| `src/components/layout/MobileNav.tsx`    | Modify  | Verify/fix token classes for light bg                                                     |
| `src/components/home/Hero.tsx`           | Rewrite | Two-column layout, logo-centered geometric graphic, orbit animation                       |
| `src/components/home/ServicesGrid.tsx`   | Modify  | Green-tint section, left-border cards, tech pill tags                                     |
| `src/components/home/FeaturedWork.tsx`   | Rewrite | Replace carousel with 2-col card grid, left-border cards                                  |
| `src/components/home/SkillsShowcase.tsx` | Modify  | Green-tint section, pill badges with hover, category bar                                  |
| `package.json`                           | Modify  | Remove `next-themes`                                                                      |

---

### Task 1: Replace CSS Design Tokens

**Files:**

- Modify: `src/styles.css`

This is the foundation. Every subsequent task depends on these tokens being correct.

- [ ] **Step 1: Replace `:root` custom properties**

Open `src/styles.css` and replace the entire `:root { ... }` block (lines 22–78) with:

```css
/* Green-on-white light theme */
:root {
  /* Background Colors */
  --background-primary: #ffffff;
  --background-secondary: #f0f9ec;
  --background-tertiary: #fafafa;

  /* Text Colors */
  --text-primary: #1a1a1a;
  --text-secondary: #4a4a4a;
  --text-tertiary: #737373;

  /* Accent Colors - Accessible Green */
  --accent-primary: #2a6b22;
  --accent-secondary: #3d8b37;
  --accent-tertiary: #1e5218;
  --accent-decorative: #6bbf59;
  --accent-light: #f0f9ec;
  --accent-mid: #dcefd4;

  /* Border Colors */
  --border-default: #e5e5e5;
  --border-accent: rgb(61 139 55 / 0.3);

  /* Additional */
  --focus-ring: #2a6b22;
  --gray-50: #fafafa;
  --gray-100: #f5f5f5;
  --gray-200: #e5e5e5;

  /* shadcn/ui compatible variables - light theme */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.39 0.11 142);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.96 0.02 142);
  --secondary-foreground: oklch(0.145 0 0);
  --muted: oklch(0.96 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.96 0.02 142);
  --accent-foreground: oklch(0.145 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.39 0.11 142);
  --chart-1: oklch(0.39 0.11 142);
  --chart-2: oklch(0.5 0.13 142);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --radius: 0.625rem;
  --sidebar-background: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.39 0.11 142);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.96 0.02 142);
  --sidebar-accent-foreground: oklch(0.145 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.39 0.11 142);
}
```

- [ ] **Step 2: Update `@theme inline` block**

Replace the `@theme inline { ... }` block (lines 80–133). Remove `--accent-info` and `--accent-warning` mappings, add new token mappings:

```css
@theme inline {
  /* Custom design tokens */
  --color-background-primary: var(--background-primary);
  --color-background-secondary: var(--background-secondary);
  --color-background-tertiary: var(--background-tertiary);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-accent-primary: var(--accent-primary);
  --color-accent-secondary: var(--accent-secondary);
  --color-accent-tertiary: var(--accent-tertiary);
  --color-accent-decorative: var(--accent-decorative);
  --color-accent-light: var(--accent-light);
  --color-accent-mid: var(--accent-mid);
  --color-border-default: var(--border-default);
  --color-border-accent: var(--border-accent);
  --color-focus-ring: var(--focus-ring);
  --color-gray-50: var(--gray-50);
  --color-gray-100: var(--gray-100);
  --color-gray-200: var(--gray-200);

  /* shadcn/ui compatible color mappings */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}
```

- [ ] **Step 3: Remove dark mode variant and update body font**

At the top of `src/styles.css`, remove line 5 (`@custom-variant dark (&:is(.dark *));`) and replace the body font-family (lines 9–11) with:

```css
body {
  @apply m-0;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 4: Add heading font rule**

After the `code { ... }` block, add:

```css
h1,
h2,
h3,
h4 {
  font-family: 'Outfit', sans-serif;
  line-height: 1.15;
}
```

- [ ] **Step 5: Fix showcase-content link accessibility**

In the `.showcase-content a` rule, change `color: var(--accent-secondary)` to `color: var(--accent-primary)`. This ensures 6.5:1 contrast (AA) for normal-text links on white.

- [ ] **Step 6: Add orbit and float keyframes**

Before the `/* Reduced Motion Support */` section, add:

```css
/* Hero graphic animations */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin-reverse {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
```

- [ ] **Step 7: Check for `--sidebar` variable rename**

The plan renames `--sidebar` to `--sidebar-background`. Search for any direct references to the old name:

```bash
grep -rn 'var(--sidebar)' src/ --include='*.tsx' --include='*.ts' --include='*.css'
```

Update any hits to use `var(--sidebar-background)`.

- [ ] **Step 8: Verify no components use removed tokens**

Search for Tailwind classes derived from the removed `--accent-info` and `--accent-warning` tokens:

```bash
grep -rn 'accent-info\|accent-warning' src/ --include='*.tsx' --include='*.ts'
```

Any hits need to be updated to use a different token (e.g., `accent-primary` or a standard Tailwind blue/amber).

- [ ] **Step 9: Verify the build compiles**

Run: `pnpm build`
Expected: Build succeeds. The site will look broken visually (dark text on white with wrong component styles) but CSS tokens are correct.

- [ ] **Step 10: Commit**

```bash
git add src/styles.css
git commit -m "feat: replace dark theme tokens with green-on-white light theme"
```

---

### Task 2: Update Root Document

**Files:**

- Modify: `src/routes/__root.tsx`
- Modify: `package.json` (remove `next-themes`)

- [ ] **Step 1: Add Google Fonts links to `head()`**

In the `links` array inside `head()` (after the favicon link), add:

```tsx
{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap' },
```

- [ ] **Step 2: Update theme-color meta tag**

In the `meta` array, change `{ name: 'theme-color', content: '#10B981' }` to `{ name: 'theme-color', content: '#2a6b22' }`.

- [ ] **Step 3: Update `RootDocument` inline styles**

Replace the `<html>` tag (remove `backgroundColor` and `colorScheme`):

```tsx
<html lang="en">
```

Replace the `<body>` tag (remove `backgroundColor` and `color`, keep `margin: 0`):

```tsx
<body style={{ margin: 0 }}>
```

- [ ] **Step 4: Update `LoadingOverlay` colors**

In the `LoadingOverlay` component, update the inline styles:

- Background: `backgroundColor: '#ffffff'`
- Spinner border: `border: '3px solid #e5e5e5'`
- Spinner top color: `borderTopColor: '#2a6b22'`

- [ ] **Step 5: Remove `next-themes` package**

Run: `pnpm remove next-themes`

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: Compiles successfully.

- [ ] **Step 7: Commit**

```bash
git add src/routes/__root.tsx package.json pnpm-lock.yaml
git commit -m "feat: update root document for light theme with Google Fonts"
```

---

### Task 3: Restyle Header and Footer

**Files:**

- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Update Header classes**

In `Header.tsx`, update the `<header>` element classes:

```tsx
<header className="sticky top-0 z-50 w-full border-b border-border-default bg-white/[92%] backdrop-blur-md transition-shadow">
```

Update the logo text — change `text-accent-secondary` to `text-accent-primary`:

```tsx
<span className="text-accent-primary">Solutions</span>
```

Update nav link hover — change `hover:text-accent-secondary` to `hover:text-accent-primary`:

```tsx
<span className="text-text-secondary hover:text-accent-primary transition-colors">
  {link.label}
</span>
```

Update active link class — change `text-accent-secondary` to `text-accent-primary`:

```tsx
activeProps={{ className: `${navigationMenuTriggerStyle()} text-accent-primary` }}
```

Add a scroll shadow effect. Import `useEffect` and `useState` at the top of `Header.tsx`, then add scroll detection inside the `Header` component:

```tsx
const [scrolled, setScrolled] = useState(false)

useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 10)
  window.addEventListener('scroll', onScroll)
  return () => window.removeEventListener('scroll', onScroll)
}, [])
```

Then add the conditional shadow class to the `<header>` element:

```tsx
<header className={`sticky top-0 z-50 w-full border-b border-border-default bg-white/[92%] backdrop-blur-md transition-shadow ${scrolled ? 'shadow-[0_1px_8px_rgba(0,0,0,0.06)]' : ''}`}>
```

- [ ] **Step 2: Restyle Footer**

In `Footer.tsx`, update the `<footer>` element:

```tsx
<footer className="bg-[#1a1a1a] border-t border-[#333]">
```

Update all text colors inside the footer:

- Brand text: change `text-text-primary` to `text-white` and `text-accent-secondary` to `text-[#a8e6a0]`
- Tagline: change `text-text-secondary` to `text-white/70`
- Section headings: change `text-text-primary` to `text-white`
- Nav links: change `text-text-secondary` to `text-white/70` and `hover:text-accent-secondary` to `hover:text-[#a8e6a0]`
- Social icons: change `text-text-secondary` to `text-white/70` and `hover:text-accent-secondary` to `hover:text-[#a8e6a0]`
- Separator: change `bg-border-default` to `bg-white/20`: `<Separator className="my-8 bg-white/20" />`
- Copyright: change `text-text-tertiary` to `text-white/50`

- [ ] **Step 3: Update MobileNav for light theme**

In `MobileNav.tsx`, the background/border token classes (`bg-background-primary`, `border-border-default`, `bg-accent-primary`) will automatically inherit correct values. However, update the active link and hover states to use `accent-primary` instead of `accent-secondary` for proper contrast on the light background:

- Change all `hover:text-accent-secondary` to `hover:text-accent-primary`
- Change `text-accent-secondary` (in `activeProps`) to `text-accent-primary`
- Change `bg-background-secondary` (in `activeProps`) to `bg-accent-light`

- [ ] **Step 4: Visual check**

Run: `pnpm dev`
Open the site. Verify:

- Header: white/frosted background, dark nav text, green CTA
- Footer: dark background, light text, green links
- Mobile nav (resize to mobile): white drawer, dark text, green button

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Footer.tsx src/components/layout/MobileNav.tsx
git commit -m "feat: restyle header, footer, and mobile nav for green-on-white theme"
```

---

### Task 4: Redesign Hero

**Files:**

- Rewrite: `src/components/home/Hero.tsx`

- [ ] **Step 1: Rewrite Hero component**

Replace the entire content of `src/components/home/Hero.tsx` with:

```tsx
import { Link } from '@tanstack/react-router'
import { FadeInView } from '~/components/shared/FadeInView'

const stats = [
  { value: '6+', label: 'Years Experience' },
  { value: '25+', label: 'Projects' },
  { value: '100%', label: 'Client Satisfaction' },
]

export function Hero() {
  return (
    <section
      className="px-8 pt-40 pb-24 max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
      aria-label="Introduction"
    >
      {/* Content */}
      <div className="max-w-[560px]">
        <FadeInView delay={0}>
          <div
            className="inline-flex items-center gap-1.5 bg-accent-light text-accent-tertiary px-3.5 py-1 rounded-full text-xs font-semibold mb-6"
            role="status"
          >
            <span className="w-2 h-2 bg-accent-decorative rounded-full animate-[pulse-dot_2s_infinite]" />
            Available for Projects
          </div>
        </FadeInView>

        <FadeInView delay={100}>
          <h1 className="text-4xl md:text-5xl lg:text-[3.6rem] font-extrabold text-text-primary mb-4 leading-tight">
            Professional
            <br />
            <span className="relative inline">
              Software Engineering
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-accent-decorative/25 rounded-sm" />
            </span>
          </h1>
        </FadeInView>

        <FadeInView delay={200}>
          <p className="text-lg text-text-secondary mb-8 max-w-[460px] leading-relaxed">
            BC Solutions delivers high-quality, scalable web applications with
            modern technologies. From concept to deployment, I build solutions
            that perform.
          </p>
        </FadeInView>

        <FadeInView delay={300}>
          <div className="flex gap-4 flex-wrap">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] bg-accent-primary text-white font-semibold text-[0.95rem] transition-all hover:bg-accent-tertiary hover:-translate-y-px hover:shadow-lg hover:shadow-accent-primary/35"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="12" height="12" rx="2" />
                <path d="M3 9h12" />
              </svg>
              View My Projects
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] bg-white text-text-primary font-semibold text-[0.95rem] border-[1.5px] border-gray-200 transition-all hover:border-accent-secondary hover:text-accent-primary"
            >
              Get in Touch
            </Link>
          </div>
        </FadeInView>

        <FadeInView delay={400}>
          <div
            className="flex gap-10 mt-12 pt-8 border-t border-gray-200"
            role="list"
            aria-label="Key statistics"
          >
            {stats.map((stat) => (
              <div key={stat.label} role="listitem">
                <div className="text-3xl font-bold text-accent-primary font-['Outfit']">
                  {stat.value}
                </div>
                <div className="text-xs text-text-secondary font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </FadeInView>
      </div>

      {/* Hero Graphic */}
      <div className="flex justify-center items-center" aria-hidden="true">
        <div className="w-[400px] h-[400px] rounded-3xl bg-gradient-to-br from-accent-light to-accent-mid relative overflow-hidden">
          {/* Orbiting rings */}
          <div className="absolute w-[300px] h-[300px] rounded-full border-2 border-accent-secondary/25 top-[50px] left-[50px] animate-[spin-slow_20s_linear_infinite]" />
          <div className="absolute w-[200px] h-[200px] rounded-full border-2 border-accent-secondary/25 top-[100px] left-[100px] animate-[spin-reverse_15s_linear_infinite]" />
          {/* Inner glow */}
          <div className="absolute w-[100px] h-[100px] rounded-full bg-accent-secondary/12 top-[150px] left-[150px]" />
          {/* Logo centered */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] flex items-center justify-center">
            <img
              src="/BC-Solutions-no-background.svg"
              alt=""
              className="w-[100px] h-[100px] object-contain"
            />
          </div>
          {/* Floating dots */}
          <div className="absolute w-2.5 h-2.5 bg-accent-decorative rounded-full top-[80px] left-[200px] animate-[float_6s_ease-in-out_infinite]" />
          <div className="absolute w-2 h-2 bg-accent-decorative rounded-full top-[200px] left-[80px] animate-[float_6s_ease-in-out_infinite_1s]" />
          <div className="absolute w-2.5 h-2.5 bg-accent-decorative rounded-full top-[280px] left-[260px] animate-[float_6s_ease-in-out_infinite_2s]" />
          <div className="absolute w-2 h-2 bg-accent-secondary rounded-full top-[160px] left-[310px] animate-[float_6s_ease-in-out_infinite_3s]" />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Remove unused imports**

The old Hero imported `Badge`, `Button`, and `AnimatedText`. The new version only needs `Link` and `FadeInView`. Verify the imports at the top of the file match only those two.

- [ ] **Step 3: Visual check**

Run: `pnpm dev`
Verify:

- Two-column layout (text left, graphic right)
- BC Solutions SVG logo visible in the center of the geometric graphic
- Circles orbit slowly in opposite directions
- Green dots float up and down
- Badge shows "Available for Projects" with pulsing dot
- Stats show green numbers
- Both CTA buttons work

- [ ] **Step 4: Commit**

```bash
git add src/components/home/Hero.tsx
git commit -m "feat: redesign hero with logo-centered geometric graphic"
```

---

### Task 5: Restyle ServicesGrid

**Files:**

- Modify: `src/components/home/ServicesGrid.tsx`

- [ ] **Step 1: Rewrite ServicesGrid**

Replace the entire content of `src/components/home/ServicesGrid.tsx` with:

```tsx
import { Code, Layers, MessageSquare } from 'lucide-react'
import { FadeInView } from '~/components/shared/FadeInView'

const services = [
  {
    icon: Code,
    title: 'Frontend Development',
    description:
      'Pixel-perfect, performant user interfaces built with the latest React ecosystem and modern CSS.',
    skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS'],
  },
  {
    icon: Layers,
    title: 'Full-Stack Solutions',
    description:
      'Robust backend systems and APIs paired with modern frontends, deployed on scalable cloud infrastructure.',
    skills: ['Node.js', 'PostgreSQL', 'AWS', 'Docker'],
  },
  {
    icon: MessageSquare,
    title: 'Technical Consulting',
    description:
      'Strategic guidance on architecture decisions, code reviews, and engineering mentorship for your team.',
    skills: ['Architecture', 'Code Review', 'Mentorship'],
  },
]

export function ServicesGrid() {
  return (
    <section
      id="services"
      className="py-20 bg-background-secondary"
      aria-labelledby="services-title"
    >
      <div className="max-w-[1200px] mx-auto px-8">
        <FadeInView delay={0}>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-primary mb-2">
            What I Do
          </div>
          <h2
            id="services-title"
            className="text-[2.4rem] font-bold text-text-primary mb-3"
          >
            Services
          </h2>
          <p className="text-text-secondary max-w-[520px] mb-12">
            End-to-end development services to bring your product vision to life
            with clean code and modern architecture.
          </p>
        </FadeInView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <FadeInView key={service.title} delay={100 + index * 100}>
              <div className="group bg-white rounded-[14px] p-8 border-l-4 border-l-accent-decorative shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 h-full">
                <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center mb-5">
                  <service.icon className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                  {service.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {service.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-accent-light text-accent-tertiary px-2.5 py-0.5 rounded-md text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Visual check**

Verify:

- Green-tinted section background
- White cards with green left border
- Icon in green-light circle (no hover color flip — simplified)
- Tech tags as green pills
- Cards lift on hover

- [ ] **Step 3: Commit**

```bash
git add src/components/home/ServicesGrid.tsx
git commit -m "feat: restyle services grid with left-border cards and green tags"
```

---

### Task 6: Rewrite FeaturedWork as Card Grid

**Files:**

- Rewrite: `src/components/home/FeaturedWork.tsx`

- [ ] **Step 1: Replace FeaturedWork with card grid**

Replace the entire content of `src/components/home/FeaturedWork.tsx` with:

```tsx
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { FadeInView } from '~/components/shared/FadeInView'
import type { ShowcaseMeta } from '@/content/projects'

interface FeaturedWorkProps {
  showcases: ShowcaseMeta[]
}

export function FeaturedWork({ showcases }: FeaturedWorkProps) {
  if (showcases.length === 0) return null

  return (
    <section id="work" className="py-20" aria-labelledby="work-title">
      <div className="max-w-[1200px] mx-auto px-8">
        <FadeInView delay={0}>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-primary mb-2">
            Portfolio
          </div>
          <h2
            id="work-title"
            className="text-[2.4rem] font-bold text-text-primary mb-3"
          >
            Featured Work
          </h2>
          <p className="text-text-secondary max-w-[520px] mb-12">
            Recent projects showcasing end-to-end development capabilities.
          </p>
        </FadeInView>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showcases.map((showcase, index) => (
            <FadeInView key={showcase.slug} delay={100 + index * 100}>
              <Link
                to="/projects/$slug"
                params={{ slug: showcase.slug }}
                className="group block bg-white rounded-[14px] p-8 border-l-4 border-l-accent-decorative shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-accent-light text-accent-tertiary px-2.5 py-0.5 rounded-md text-xs font-semibold">
                    {showcase.year}
                  </span>
                  <span className="text-text-secondary text-sm">
                    {showcase.client}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                  {showcase.title}
                </h3>
                <p className="text-sm text-text-secondary mb-5 leading-relaxed">
                  {showcase.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {showcase.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-100 text-text-secondary px-2 py-0.5 rounded text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </FadeInView>
          ))}
        </div>

        <FadeInView delay={300}>
          <div className="mt-8 text-center">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 text-accent-primary font-semibold hover:text-accent-tertiary transition-colors"
            >
              View all work <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeInView>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Visual check**

Verify:

- 2-column card grid (no carousel)
- White cards with green left border
- Year badge + client type label
- Gray tech tags
- Card title turns green on hover
- "View all work" link at bottom

- [ ] **Step 3: Commit**

```bash
git add src/components/home/FeaturedWork.tsx
git commit -m "feat: replace carousel with 2-column card grid for featured work"
```

---

### Task 7: Restyle SkillsShowcase

**Files:**

- Modify: `src/components/home/SkillsShowcase.tsx`

- [ ] **Step 1: Rewrite SkillsShowcase**

Replace the entire content of `src/components/home/SkillsShowcase.tsx` with:

```tsx
import { FadeInView } from '~/components/shared/FadeInView'

const skillCategories = [
  {
    name: 'Frontend',
    skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS', 'Vue.js'],
  },
  {
    name: 'Backend',
    skills: ['Node.js', 'Python', 'Java', 'PostgreSQL', 'MongoDB', 'Redis'],
  },
  {
    name: 'Tools',
    skills: ['Git', 'Docker', 'Kubernetes', 'Webpack', 'Vite', 'Jest'],
  },
  {
    name: 'Cloud',
    skills: ['AWS', 'GCP', 'Vercel', 'Cloudflare', 'CI/CD', 'Terraform'],
  },
]

export function SkillsShowcase() {
  return (
    <section
      id="skills"
      className="py-20 bg-background-secondary"
      aria-labelledby="skills-title"
    >
      <div className="max-w-[1200px] mx-auto px-8">
        <FadeInView delay={0}>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-primary mb-2">
            Expertise
          </div>
          <h2
            id="skills-title"
            className="text-[2.4rem] font-bold text-text-primary mb-3"
          >
            Skills & Technologies
          </h2>
          <p className="text-text-secondary max-w-[520px] mb-12">
            A broad toolkit honed across years of professional development.
          </p>
        </FadeInView>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {skillCategories.map((category, index) => (
            <FadeInView key={category.name} delay={100 + index * 100}>
              <div>
                <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="w-[3px] h-[18px] bg-accent-decorative rounded-sm" />
                  {category.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-white border-[1.5px] border-gray-200 text-text-primary px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 hover:border-accent-secondary hover:bg-accent-light hover:text-accent-tertiary cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Visual check**

Verify:

- Green-tinted section background
- 4-column grid with category names
- Green bar before each category name
- White pill badges with subtle border
- Pills highlight green on hover

- [ ] **Step 3: Commit**

```bash
git add src/components/home/SkillsShowcase.tsx
git commit -m "feat: restyle skills showcase with pill badges and green category bars"
```

---

### Task 8: Add Contact CTA Section to Homepage

**Files:**

- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Add contact section to homepage**

In `src/routes/index.tsx`, add the contact CTA section after `SkillsShowcase`. Update the `HomePage` component:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '~/components/home/Hero'
import { ServicesGrid } from '~/components/home/ServicesGrid'
import { SkillsShowcase } from '~/components/home/SkillsShowcase'
import { FeaturedWork } from '~/components/home/FeaturedWork'
import { FadeInView } from '~/components/shared/FadeInView'
import { getFeaturedShowcases } from '@/content/projects'

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => ({ showcases: getFeaturedShowcases() }),
})

function HomePage() {
  const { showcases } = Route.useLoaderData()

  return (
    <main>
      <Hero />
      <ServicesGrid />
      <FeaturedWork showcases={showcases} />
      <SkillsShowcase />

      {/* Contact CTA */}
      <FadeInView>
        <section
          id="contact"
          className="py-20 pb-24 text-center"
          aria-labelledby="contact-title"
        >
          <div className="max-w-[1200px] mx-auto px-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-primary mb-2">
              Contact
            </div>
            <h2
              id="contact-title"
              className="text-[2.4rem] font-bold text-text-primary mb-3"
            >
              Let's Work Together
            </h2>
            <p className="text-text-secondary max-w-[460px] mx-auto mb-8">
              Have a project in mind? I'd love to hear about it. Reach out and
              let's discuss how I can help.
            </p>
            <a
              href="mailto:BC@bcordes.dev"
              className="inline-flex items-center gap-2 bg-accent-primary text-white font-semibold text-base px-8 py-3.5 rounded-[10px] transition-all hover:bg-accent-tertiary hover:-translate-y-px hover:shadow-lg hover:shadow-accent-primary/35"
            >
              Get in Touch
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </section>
      </FadeInView>
    </main>
  )
}
```

- [ ] **Step 2: Visual check**

Verify: centered contact section with green CTA button at the bottom of the homepage.

- [ ] **Step 3: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: add contact CTA section to homepage"
```

---

### Task 9: Final Verification and Cleanup

- [ ] **Step 1: Full visual review**

Run: `pnpm dev`
Walk through every page:

- `/` — all homepage sections match the mockup's style
- `/projects` — cards inherit new tokens (green accents, light borders)
- `/projects/:slug` — showcase content readable on white bg, links accessible
- `/about` — verify no glow blobs remain, text readable
- `/contact` — form inputs have correct border/focus colors
- `/resume` — check readability

- [ ] **Step 2: Check for remaining dark-theme artifacts**

Run a search for hardcoded dark colors that may have been missed:

```bash
grep -rn '#0a0a0a\|#141414\|#1e1e1e\|#262626\|#059669\|#10b981\|#047857' src/ --include='*.tsx' --include='*.ts'
```

Any results (other than in test files) need updating to use CSS variables or the new palette values.

- [ ] **Step 3: Search for `border-border-subtle` references**

```bash
grep -rn 'border-subtle' src/ --include='*.tsx'
```

Replace any hits with `border-border-default` or `border-gray-200`.

- [ ] **Step 4: Remove remaining glow blobs from About page**

Search for `blur-[120px]` or `blur-[80px]` in `src/components/about/` and remove those decorative divs.

- [ ] **Step 5: Build check**

Run: `pnpm build`
Expected: Clean build, no errors.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: clean up remaining dark theme artifacts"
```
