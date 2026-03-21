# BC Solutions Website Design

**Date:** 2026-01-21
**Project:** BC Solutions Professional Portfolio Site
**Author:** Bryan Cordes

## Executive Summary

This design creates a performance-first, dark-mode portfolio website for BC Solutions that showcases freelance software engineering work. The site uses interactive animations, serves multiple visitor types (clients, recruiters, developers), and integrates with a future C# backend via type-safe APIs.

## Design Principles

1. **Performance above all** - 60fps animations, 95+ Lighthouse scores, WCAG AA compliance
2. **shadcn-first** - Use existing component library before building custom components
3. **Mobile-responsive** - Mobile-first design for all devices
4. **Accessible** - Full keyboard navigation, screen reader support, reduced motion support
5. **Type-safe** - Orval generates TypeScript from C# backend OpenAPI specs

## Technology Stack

### Frontend
- React 19 with TanStack Start (SSR)
- TanStack Router (file-based routing)
- TanStack Query (server state)
- Tailwind CSS 4 (styling)
- shadcn/ui (component library)

### Backend & Data
- Nitro (server runtime)
- oRPC (type-safe API layer)
- Drizzle ORM + PostgreSQL (database)
- Orval (C# backend integration)

### Performance
- CSS animations only (GPU-accelerated)
- Intersection Observer (lazy loading)
- Code splitting (automatic via TanStack Router)
- Web Vitals monitoring

## Visual Design

### Color Palette (Dark Mode)

```
Backgrounds
  Primary:   #0a0a0a (near black)
  Secondary: #141414 (cards)
  Tertiary:  #1e1e1e (hover states)

Text
  Primary:   #f5f5f5 (high contrast)
  Secondary: #a3a3a3 (muted)
  Tertiary:  #737373 (subtle)

Accents
  Primary:   #059669 (dark emerald - brand, CTAs)
  Secondary: #10b981 (medium green - highlights)
  Tertiary:  #047857 (deep green - pressed states)
  Info:      #3b82f6 (blue)
  Warning:   #f59e0b (amber)

Borders
  Default:   #262626
  Accent:    #05966933 (green with transparency)
```

### Typography

- **Headings:** System font stack (SF Pro, Segoe UI, Roboto)
- **Body:** 1rem, 400 weight, 1.6 line-height
- **Code:** JetBrains Mono

### Animation Patterns

All animations respect `prefers-reduced-motion`:

1. **Fade-in on scroll** - `opacity` + `translateY`
2. **Hover effects** - Subtle scale (1.02), brightness shifts
3. **Text reveals** - Staggered character animations for hero
4. **Button press** - Scale down (0.98) + ripple
5. **Link underlines** - Slide-in from left
6. **Scroll progress** - Thin line showing page position

## Site Structure

```
/ (Home)
├── /work (Portfolio)
│   ├── /work/[slug] (Project details)
│   └── /work/skills (Skill demonstrations)
├── /about (Story, process, values)
├── /blog (Technical articles)
│   └── /blog/[slug]
├── /contact (Contact options)
└── /resume (Interactive resume)
```

### Navigation

- Fixed header with NavigationMenu (shadcn)
- Mobile: Sheet component (drawer)
- Breadcrumbs on detail pages
- Floating contact button (mobile)

### Multiple Entry Paths

Homepage routes different visitors:

1. **Clients:** Hero → Work → Contact
2. **Recruiters:** Skills → Resume → LinkedIn
3. **Developers:** Blog → GitHub → Demos
4. **General:** About → Work → Contact

## Component Architecture

### shadcn Components (Use First)

- **Navigation:** NavigationMenu, Sheet
- **Content:** Card, Carousel, Tabs, Accordion, Separator
- **Forms:** Form, Input, Select, Checkbox
- **Feedback:** Toast (sonner), Dialog, Progress
- **Interactive:** Command, Tooltip, HoverCard
- **Data:** Table, Badge

### Custom Components (Only When Needed)

```
src/components/
├── layout/
│   ├── Header.tsx (NavigationMenu wrapper)
│   ├── Footer.tsx (links, social)
│   ├── MobileNav.tsx (Sheet wrapper)
│   └── ScrollProgress.tsx (Progress wrapper)
├── home/
│   ├── Hero.tsx (animated intro)
│   ├── ServicesGrid.tsx (Card grid)
│   ├── FeaturedWork.tsx (Carousel)
│   ├── SkillsShowcase.tsx (Tabs)
│   └── ContactCTA.tsx (Dialog trigger)
├── work/
│   ├── ProjectCard.tsx (Card + HoverCard)
│   ├── ProjectDetail.tsx (Accordion)
│   ├── SkillDemo.tsx (Tabs)
│   └── FilterBar.tsx (Command)
├── shared/
│   ├── AnimatedText.tsx (text reveal)
│   └── FadeInView.tsx (scroll wrapper)
└── forms/
    ├── ContactForm.tsx (Form + react-hook-form)
    └── NewsletterForm.tsx (Input + Button)
```

## Database Schema

```typescript
// Contact submissions
contacts {
  id: serial
  name: text
  email: text
  company: text?
  message: text
  projectType: text? // frontend, fullstack, consulting
  budget: text?
  createdAt: timestamp
  status: text // new, read, responded
}

// Simple analytics
pageViews {
  id: serial
  path: text
  referrer: text?
  userAgent: text?
  timestamp: timestamp
}

// Optional engagement
projectReactions {
  id: serial
  projectSlug: text
  sessionId: text
  createdAt: timestamp
}

// Optional newsletter
subscribers {
  id: serial
  email: text unique
  subscribedAt: timestamp
  active: boolean
}
```

## API Structure (oRPC)

```typescript
// src/orpc/routes/
contact.ts
  └── submitContact(name, email, message, projectType, budget)

analytics.ts
  └── trackPageView(path, referrer)

projects.ts
  ├── getProjects() // MDX metadata
  ├── getProjectBySlug(slug)
  └── addProjectReaction(projectSlug, sessionId)

newsletter.ts
  └── subscribe(email)
```

## Content Management (Hybrid)

### Static Content (MDX)

```
src/content/
├── projects/
│   ├── drop-enforcement-module.mdx
│   ├── valiantys-nx-migration.mdx
│   └── hyperion-iot-platform.mdx
├── blog/
│   └── building-performant-dark-mode.mdx
└── config.ts
```

Frontmatter structure:
```yaml
---
title: "Drop Enforcement Module"
description: "Customer-facing compliance workflow"
client: "Drop"
year: "2025"
tags: ["Angular", "TypeScript", "Compliance"]
featured: true
image: "/projects/drop-cover.jpg"
---
```

### Dynamic Content (Database)

- Contact forms → Postgres
- Analytics → Postgres
- Future: Comments, reactions

## Orval Integration (Future C# Backend)

```typescript
// orval.config.ts
export default defineConfig({
  bcSolutionsApi: {
    input: {
      target: './openapi.json', // From C# backend
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
```

Generates type-safe hooks: `useGetProjects()`, `useSubmitContact()`

## Performance Targets

- **Lighthouse Performance:** 95+
- **Lighthouse Accessibility:** 100
- **Lighthouse SEO:** 100
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.5s
- **Cumulative Layout Shift:** < 0.1

## Accessibility Requirements

- WCAG 2.1 AA compliance minimum
- Semantic HTML with proper heading hierarchy
- ARIA labels where needed
- Keyboard navigation for all interactions
- `prefers-reduced-motion` support
- AAA color contrast ratios
- Screen reader announcements for dynamic content

## Implementation Phases

### Phase 1: Foundation
- Tailwind theme with dark green palette
- Layout components (Header, Footer)
- Animation utilities (FadeInView, AnimatedText)
- Database schema and migrations

### Phase 2: Homepage
- Hero section with animated text
- Services grid
- Featured work carousel
- Skills showcase
- Contact CTA

### Phase 3: Work Section
- Project listing page with filtering
- Project detail pages (MDX rendering)
- Skill demonstration components
- Project reactions feature

### Phase 4: Additional Pages
- About page
- Contact page with form
- Resume page (interactive)
- Blog setup (MDX rendering)

### Phase 5: Polish & Optimization
- Performance optimization
- Accessibility audit
- SEO optimization
- Analytics integration
- Testing

### Phase 6: Future Integration
- Orval setup for C# backend
- API client configuration
- Type-safe backend integration

## Success Criteria

1. Lighthouse scores meet targets
2. Site loads in < 2s on 3G
3. All interactions accessible via keyboard
4. Contact form successfully stores submissions
5. Portfolio projects display correctly
6. Animations perform at 60fps
7. Mobile experience matches desktop quality
