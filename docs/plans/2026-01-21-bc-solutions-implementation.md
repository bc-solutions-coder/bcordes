# BC Solutions Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a performance-first, dark-mode portfolio website for BC Solutions with interactive animations, multiple visitor paths, and type-safe API integration.

**Architecture:** TanStack Start (React 19 + SSR) with file-based routing, shadcn/ui components, Tailwind CSS dark theme with dark green accents, Drizzle ORM + PostgreSQL for dynamic content, and MDX for static content. All animations use CSS for 60fps performance.

**Tech Stack:** React 19, TanStack Router, TanStack Query, Tailwind CSS 4, shadcn/ui, Drizzle ORM, PostgreSQL, oRPC, Orval (future), MDX

---

## Phase 1: Foundation Setup

### Task 1: Tailwind Dark Theme Configuration

**Files:**
- Modify: `app.css`
- Create: `src/lib/design-tokens.ts`

**Step 1: Add dark theme colors to Tailwind**

Update `app.css`:
```css
@import "tailwindcss";

@theme {
  /* Background Colors */
  --color-background-primary: #0a0a0a;
  --color-background-secondary: #141414;
  --color-background-tertiary: #1e1e1e;

  /* Text Colors */
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a3a3a3;
  --color-text-tertiary: #737373;

  /* Accent Colors - Dark Green */
  --color-accent-primary: #059669;
  --color-accent-secondary: #10b981;
  --color-accent-tertiary: #047857;
  --color-accent-info: #3b82f6;
  --color-accent-warning: #f59e0b;

  /* Border Colors */
  --color-border-default: #262626;
  --color-border-accent: rgb(5 150 105 / 0.2);

  /* Semantic Colors */
  --color-primary: var(--color-accent-primary);
  --color-success: var(--color-accent-primary);
  --color-info: var(--color-accent-info);
  --color-warning: var(--color-accent-warning);
}

body {
  background-color: var(--color-background-primary);
  color: var(--color-text-primary);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 2: Create design tokens helper**

Create `src/lib/design-tokens.ts`:
```typescript
export const colors = {
  background: {
    primary: '#0a0a0a',
    secondary: '#141414',
    tertiary: '#1e1e1e',
  },
  text: {
    primary: '#f5f5f5',
    secondary: '#a3a3a3',
    tertiary: '#737373',
  },
  accent: {
    primary: '#059669',
    secondary: '#10b981',
    tertiary: '#047857',
    info: '#3b82f6',
    warning: '#f59e0b',
  },
  border: {
    default: '#262626',
    accent: 'rgba(5, 150, 105, 0.2)',
  },
} as const;

export const animations = {
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '350ms',
  },
  easing: {
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;
```

**Step 3: Test theme in browser**

Run: `pnpm dev`
Expected: App loads with dark background, light text

**Step 4: Commit**

```bash
git add app.css src/lib/design-tokens.ts
git commit -m "feat: add dark theme with green accent colors

- Configure Tailwind dark theme colors
- Add design token helper
- Include reduced motion support"
```

---

### Task 2: Animation Utilities

**Files:**
- Create: `src/lib/animations.ts`
- Create: `src/hooks/useReducedMotion.ts`
- Create: `src/hooks/useScrollAnimation.ts`

**Step 1: Create animation helper functions**

Create `src/lib/animations.ts`:
```typescript
export const fadeInVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideInVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleInVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const getTransition = (duration: 'fast' | 'base' | 'slow' = 'base') => {
  const durations = {
    fast: 0.15,
    base: 0.25,
    slow: 0.35,
  };

  return {
    duration: durations[duration],
    ease: [0.4, 0, 0.2, 1], // ease-in-out cubic-bezier
  };
};
```

**Step 2: Create reduced motion hook**

Create `src/hooks/useReducedMotion.ts`:
```typescript
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReducedMotion;
}
```

**Step 3: Create scroll animation hook**

Create `src/hooks/useScrollAnimation.ts`:
```typescript
import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation<T extends HTMLElement>(
  options: UseScrollAnimationOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}
```

**Step 4: Test hooks in dev mode**

Run: `pnpm dev`
Expected: No TypeScript errors, hooks available for import

**Step 5: Commit**

```bash
git add src/lib/animations.ts src/hooks/useReducedMotion.ts src/hooks/useScrollAnimation.ts
git commit -m "feat: add animation utilities and hooks

- Add animation variant helpers
- Add reduced motion detection hook
- Add scroll-triggered animation hook with Intersection Observer"
```

---

### Task 3: Database Schema Setup

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/migrations/0001_add_bc_solutions_tables.sql`

**Step 1: Update database schema**

Modify `src/db/schema.ts`:
```typescript
import { boolean, pgTable, serial, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

// Contact form submissions
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company'),
  message: text('message').notNull(),
  projectType: text('project_type'), // frontend, fullstack, consulting
  budget: text('budget'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: text('status').default('new').notNull(), // new, read, responded
});

// Page analytics (simple tracking)
export const pageViews = pgTable('page_views', {
  id: serial('id').primaryKey(),
  path: text('path').notNull(),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Project reactions (optional engagement)
export const projectReactions = pgTable('project_reactions', {
  id: serial('id').primaryKey(),
  projectSlug: text('project_slug').notNull(),
  sessionId: text('session_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Newsletter subscribers (optional)
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  subscribedAt: timestamp('subscribed_at').defaultNow().notNull(),
  active: boolean('active').default(true).notNull(),
});
```

**Step 2: Generate migration**

Run: `pnpm db:generate`
Expected: New migration file created in `drizzle/migrations/`

**Step 3: Run migration**

Run: `pnpm db:push`
Expected: Tables created in database

**Step 4: Verify tables in database**

Run: `pnpm db:studio`
Expected: Drizzle Studio opens, shows new tables

**Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/migrations/*
git commit -m "feat: add database schema for BC Solutions

- Add contacts table for form submissions
- Add pageViews for analytics
- Add projectReactions for engagement
- Add subscribers for newsletter"
```

---

## Phase 2: Shared Components

### Task 4: FadeInView Animation Component

**Files:**
- Create: `src/components/shared/FadeInView.tsx`

**Step 1: Create FadeInView component**

Create `src/components/shared/FadeInView.tsx`:
```typescript
import { useScrollAnimation } from '~/hooks/useScrollAnimation';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { cn } from '~/lib/utils';

interface FadeInViewProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}

export function FadeInView({
  children,
  className,
  delay = 0,
  threshold = 0.1,
}: FadeInViewProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold });
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-500 ease-out',
        prefersReducedMotion
          ? 'opacity-100 translate-y-0'
          : isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8',
        className
      )}
      style={{
        transitionDelay: prefersReducedMotion ? '0ms' : `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
```

**Step 2: Test component in dev mode**

Run: `pnpm dev`
Expected: Component compiles without errors

**Step 3: Commit**

```bash
git add src/components/shared/FadeInView.tsx
git commit -m "feat: add FadeInView scroll animation component

- Wraps children with fade-in effect on scroll
- Respects reduced motion preferences
- Supports delay and threshold configuration"
```

---

### Task 5: AnimatedText Component

**Files:**
- Create: `src/components/shared/AnimatedText.tsx`

**Step 1: Create AnimatedText component**

Create `src/components/shared/AnimatedText.tsx`:
```typescript
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { cn } from '~/lib/utils';

interface AnimatedTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  staggerDelay?: number;
}

export function AnimatedText({
  text,
  className,
  as: Component = 'span',
  staggerDelay = 30,
}: AnimatedTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const words = text.split(' ');

  if (prefersReducedMotion) {
    return <Component className={className}>{text}</Component>;
  }

  return (
    <Component className={cn('inline-block', className)}>
      {words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          className="inline-block animate-fade-in-up opacity-0"
          style={{
            animationDelay: `${wordIndex * staggerDelay}ms`,
            animationFillMode: 'forwards',
          }}
        >
          {word}
          {wordIndex < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </Component>
  );
}
```

**Step 2: Add animation to app.css**

Add to `app.css`:
```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Step 3: Test animation in browser**

Run: `pnpm dev`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/components/shared/AnimatedText.tsx app.css
git commit -m "feat: add AnimatedText component

- Staggered word-by-word fade-in animation
- Respects reduced motion preferences
- Configurable stagger delay"
```

---

### Task 6: Layout Header Component

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/MobileNav.tsx`

**Step 1: Add missing shadcn components**

Run: `pnpx shadcn@latest add navigation-menu sheet`
Expected: Components added to `src/components/ui/`

**Step 2: Create Header component**

Create `src/components/layout/Header.tsx`:
```typescript
import { Link } from '@tanstack/react-router';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '~/components/ui/navigation-menu';
import { Button } from '~/components/ui/button';
import { MobileNav } from './MobileNav';

const navItems = [
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Resume', href: '/resume' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-default)] bg-[var(--color-background-primary)]/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-[var(--color-accent-primary)]">
            BC Solutions
          </span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <Link to={item.href}>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    {item.label}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* CTA Button */}
        <div className="hidden md:flex">
          <Button
            asChild
            className="bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-secondary)]"
          >
            <Link to="/contact">Get in Touch</Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <MobileNav items={navItems} />
      </div>
    </header>
  );
}
```

**Step 3: Create MobileNav component**

Create `src/components/layout/MobileNav.tsx`:
```typescript
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet';
import { Button } from '~/components/ui/button';

interface NavItem {
  label: string;
  href: string;
}

interface MobileNavProps {
  items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col space-y-4">
          {items.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setOpen(false)}
              className="text-lg font-medium transition-colors hover:text-[var(--color-accent-primary)]"
            >
              {item.label}
            </Link>
          ))}
          <Button
            asChild
            className="mt-4 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-secondary)]"
          >
            <Link to="/contact" onClick={() => setOpen(false)}>
              Get in Touch
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 4: Test header in browser**

Run: `pnpm dev`
Expected: Header renders, mobile menu works, navigation functions

**Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/MobileNav.tsx src/components/ui/navigation-menu.tsx src/components/ui/sheet.tsx
git commit -m "feat: add Header and MobileNav components

- Desktop navigation with shadcn NavigationMenu
- Mobile drawer with shadcn Sheet
- Responsive design with brand colors
- Sticky header with backdrop blur"
```

---

### Task 7: Layout Footer Component

**Files:**
- Create: `src/components/layout/Footer.tsx`

**Step 1: Add Separator component**

Run: `pnpx shadcn@latest add separator`
Expected: Separator component added

**Step 2: Create Footer component**

Create `src/components/layout/Footer.tsx`:
```typescript
import { Link } from '@tanstack/react-router';
import { Github, Linkedin, Mail } from 'lucide-react';
import { Separator } from '~/components/ui/separator';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border-default)] bg-[var(--color-background-secondary)]">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--color-accent-primary)]">
              BC Solutions
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Professional freelance software engineering services
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Navigation</h4>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link
                to="/work"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
              >
                Work
              </Link>
              <Link
                to="/about"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
              >
                About
              </Link>
              <Link
                to="/blog"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
              >
                Blog
              </Link>
              <Link
                to="/resume"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
              >
                Resume
              </Link>
            </nav>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Services</h4>
            <ul className="flex flex-col space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>Frontend Development</li>
              <li>Full-Stack Solutions</li>
              <li>Technical Consulting</li>
              <li>Code Architecture</li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Connect</h4>
            <div className="flex space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/in/bacordes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:Bryan.Cordes@bcordes.dev"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-[var(--color-text-tertiary)] md:flex-row">
          <p>© {currentYear} BC Solutions. All rights reserved.</p>
          <p>Built with React, TanStack, and Tailwind CSS</p>
        </div>
      </div>
    </footer>
  );
}
```

**Step 3: Test footer in browser**

Run: `pnpm dev`
Expected: Footer renders with all sections, links work

**Step 4: Commit**

```bash
git add src/components/layout/Footer.tsx src/components/ui/separator.tsx
git commit -m "feat: add Footer component

- Four-column layout with brand, navigation, services, social
- Social media links with icons
- Responsive grid layout
- Brand colors and hover effects"
```

---

### Task 8: Update Root Layout

**Files:**
- Modify: `src/routes/__root.tsx`

**Step 1: Update root route with layout**

Modify `src/routes/__root.tsx`:
```typescript
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Header } from '~/components/layout/Header';
import { Footer } from '~/components/layout/Footer';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}
```

**Step 2: Test layout in browser**

Run: `pnpm dev`
Expected: Header and footer appear on all pages, main content in between

**Step 3: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: update root layout with header and footer

- Add Header and Footer to all pages
- Flex layout with main content between
- Maintain TanStack devtools"
```

---

## Phase 3: Homepage Components

### Task 9: Hero Section

**Files:**
- Create: `src/components/home/Hero.tsx`
- Create: `src/routes/index.tsx` (modify)

**Step 1: Create Hero component**

Create `src/components/home/Hero.tsx`:
```typescript
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { AnimatedText } from '~/components/shared/AnimatedText';
import { FadeInView } from '~/components/shared/FadeInView';

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-20">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--color-background-primary)] via-[var(--color-background-secondary)] to-[var(--color-background-primary)]" />

      {/* Accent glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent-primary)] opacity-5 blur-[100px]" />

      <div className="mx-auto max-w-4xl text-center">
        <FadeInView>
          <div className="mb-6 inline-block rounded-full border border-[var(--color-border-accent)] bg-[var(--color-background-secondary)] px-4 py-2 text-sm">
            <span className="text-[var(--color-accent-primary)]">●</span>{' '}
            <span className="text-[var(--color-text-secondary)]">
              Available for Projects
            </span>
          </div>
        </FadeInView>

        <AnimatedText
          text="Professional Software Engineering Solutions"
          as="h1"
          className="mb-6 text-4xl font-bold leading-tight md:text-6xl"
        />

        <FadeInView delay={400}>
          <p className="mb-8 text-lg text-[var(--color-text-secondary)] md:text-xl">
            Delivering high-quality frontend and full-stack solutions with 6+ years
            of experience. Specializing in React, Angular, and modern web technologies.
          </p>
        </FadeInView>

        <FadeInView delay={600}>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-secondary)] text-white"
            >
              <Link to="/work">
                View My Work
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[var(--color-border-accent)] hover:bg-[var(--color-background-tertiary)]"
            >
              <Link to="/contact">Get in Touch</Link>
            </Button>
          </div>
        </FadeInView>

        <FadeInView delay={800}>
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-[var(--color-text-tertiary)]">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--color-accent-primary)]">
                6+
              </span>
              <span>Years Experience</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--color-accent-primary)]">
                25+
              </span>
              <span>Projects Delivered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--color-accent-primary)]">
                100%
              </span>
              <span>Client Satisfaction</span>
            </div>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
```

**Step 2: Update homepage route**

Modify `src/routes/index.tsx`:
```typescript
import { createFileRoute } from '@tanstack/react-router';
import { Hero } from '~/components/home/Hero';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <Hero />
    </div>
  );
}
```

**Step 3: Test hero in browser**

Run: `pnpm dev`
Expected: Hero section displays with animations, CTAs work

**Step 4: Commit**

```bash
git add src/components/home/Hero.tsx src/routes/index.tsx
git commit -m "feat: add Hero section to homepage

- Animated headline with staggered text
- Availability badge and stats
- Dual CTA buttons
- Background gradient with green glow
- Fully responsive layout"
```

---

### Task 10: Services Grid

**Files:**
- Create: `src/components/home/ServicesGrid.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Add Card component**

Run: `pnpx shadcn@latest add card`
Expected: Card component added

**Step 2: Create ServicesGrid component**

Create `src/components/home/ServicesGrid.tsx`:
```typescript
import { Code, Layers, MessageSquare } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { FadeInView } from '~/components/shared/FadeInView';

const services = [
  {
    icon: Code,
    title: 'Frontend Development',
    description:
      'Expert in React, Angular, and Svelte. Building fast, accessible, and beautiful user interfaces.',
    skills: ['React 19', 'Angular 20', 'TypeScript', 'Tailwind CSS'],
  },
  {
    icon: Layers,
    title: 'Full-Stack Solutions',
    description:
      'End-to-end development with Node.js, C#, and modern databases. Scalable architecture from frontend to backend.',
    skills: ['Node.js', 'Nest.js', 'PostgreSQL', 'GraphQL'],
  },
  {
    icon: MessageSquare,
    title: 'Technical Consulting',
    description:
      'Code reviews, architecture planning, and team mentoring. Helping organizations deliver better software.',
    skills: ['Code Review', 'Architecture', 'Agile', 'Monorepos'],
  },
];

export function ServicesGrid() {
  return (
    <section className="container px-4 py-20">
      <FadeInView>
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">What I Do</h2>
          <p className="text-lg text-[var(--color-text-secondary)]">
            Comprehensive software engineering services tailored to your needs
          </p>
        </div>
      </FadeInView>

      <div className="grid gap-6 md:grid-cols-3">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <FadeInView key={service.title} delay={index * 100}>
              <Card className="group h-full border-[var(--color-border-default)] bg-[var(--color-background-secondary)] transition-all hover:border-[var(--color-border-accent)] hover:bg-[var(--color-background-tertiary)]">
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] transition-colors group-hover:bg-[var(--color-accent-primary)] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {service.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[var(--color-background-primary)] px-3 py-1 text-xs text-[var(--color-text-secondary)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          );
        })}
      </div>
    </section>
  );
}
```

**Step 3: Add to homepage**

Modify `src/routes/index.tsx`:
```typescript
import { createFileRoute } from '@tanstack/react-router';
import { Hero } from '~/components/home/Hero';
import { ServicesGrid } from '~/components/home/ServicesGrid';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <Hero />
      <ServicesGrid />
    </div>
  );
}
```

**Step 4: Test services grid**

Run: `pnpm dev`
Expected: Three service cards display with hover effects, animations work

**Step 5: Commit**

```bash
git add src/components/home/ServicesGrid.tsx src/routes/index.tsx src/components/ui/card.tsx
git commit -m "feat: add ServicesGrid to homepage

- Three service cards with icons
- Hover effects with border color change
- Skill tags for each service
- Staggered fade-in animations"
```

---

## Phase 4: Content Infrastructure

### Task 11: MDX Setup for Projects

**Files:**
- Create: `src/content/projects/drop-enforcement-module.mdx`
- Create: `src/lib/mdx.ts`

**Step 1: Install MDX dependencies**

Run: `pnpm add @mdx-js/rollup remark-gfm rehype-highlight`
Expected: Dependencies installed

**Step 2: Create MDX utility**

Create `src/lib/mdx.ts`:
```typescript
import fs from 'fs/promises';
import path from 'path';
import { compileMDX } from 'next-mdx-remote/rsc';

const CONTENT_DIR = path.join(process.cwd(), 'src/content');

export interface ProjectFrontmatter {
  title: string;
  description: string;
  client: string;
  year: string;
  tags: string[];
  featured: boolean;
  image: string;
}

export interface Project {
  slug: string;
  frontmatter: ProjectFrontmatter;
  content: string;
}

export async function getProjects(): Promise<Project[]> {
  const projectsDir = path.join(CONTENT_DIR, 'projects');
  const files = await fs.readdir(projectsDir);

  const projects = await Promise.all(
    files
      .filter((file) => file.endsWith('.mdx'))
      .map(async (file) => {
        const slug = file.replace('.mdx', '');
        const filePath = path.join(projectsDir, file);
        const source = await fs.readFile(filePath, 'utf-8');

        const { frontmatter, content } = await compileMDX<ProjectFrontmatter>({
          source,
          options: {
            parseFrontmatter: true,
          },
        });

        return {
          slug,
          frontmatter,
          content: content.toString(),
        };
      })
  );

  return projects.sort((a, b) =>
    parseInt(b.frontmatter.year) - parseInt(a.frontmatter.year)
  );
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) || null;
}
```

**Step 3: Create first project MDX**

Create `src/content/projects/drop-enforcement-module.mdx`:
```mdx
---
title: "Drop Enforcement Module"
description: "Customer-facing enforcement management module enabling violation tracking workflows with complete audit trails for state regulatory compliance"
client: "Drop"
year: "2025"
tags: ["Angular", "TypeScript", "Compliance", "Enterprise"]
featured: true
image: "/projects/drop-enforcement.jpg"
---

## Challenge

Drop needed a customer-facing enforcement management system that would enable consultants and clients to create violation tracking workflows with complete audit trails for state regulatory compliance.

## Solution

Designed and built a comprehensive enforcement management module in Angular 20 that provided:

- **Workflow Creation**: Intuitive interface for consultants to design custom enforcement workflows
- **Violation Tracking**: Complete tracking system from identification through resolution
- **Audit Trails**: Comprehensive logging of all actions for regulatory compliance
- **Self-Service Portal**: Customer visibility into enforcement plan status

## Technical Implementation

- Built with Angular 20 and TypeScript
- Integrated with existing enterprise architecture
- Implemented complex state management for workflow tracking
- Designed responsive UI for desktop and tablet use
- Created comprehensive audit logging system

## Impact

- Reduced support inquiries through self-service visibility
- Streamlined communication between consultants and customers
- Enabled real-time tracking of corrective actions
- Ensured regulatory compliance through complete audit trails
- Early contract completion ahead of schedule

## Technologies

Angular 20, TypeScript, RxJS, Angular Material, REST APIs
```

**Step 4: Test MDX parsing**

Run: `pnpm dev`
Expected: No build errors, MDX utilities available

**Step 5: Commit**

```bash
git add src/lib/mdx.ts src/content/projects/drop-enforcement-module.mdx package.json pnpm-lock.yaml
git commit -m "feat: add MDX infrastructure for project content

- Install MDX dependencies
- Create MDX parsing utilities
- Add first project case study (Drop)
- Support frontmatter with metadata"
```

---

## Remaining Tasks Summary

Due to length constraints, here's a summary of remaining implementation tasks:

### Phase 5: Work Portfolio (Tasks 12-15)
- Task 12: Work listing page with filtering
- Task 13: Project detail page with MDX rendering
- Task 14: Featured work carousel for homepage
- Task 15: Skills showcase component

### Phase 6: Forms & API (Tasks 16-18)
- Task 16: Contact form with validation
- Task 17: oRPC API endpoints for contacts
- Task 18: Analytics tracking

### Phase 7: Additional Pages (Tasks 19-22)
- Task 19: About page
- Task 20: Resume page
- Task 21: Contact page
- Task 22: Blog infrastructure

### Phase 8: Polish & Optimization (Tasks 23-26)
- Task 23: Performance optimization
- Task 24: Accessibility audit
- Task 25: SEO optimization
- Task 26: Testing setup

### Phase 9: Future Integration (Task 27)
- Task 27: Orval configuration for C# backend

---

## Success Criteria Checklist

- [ ] Lighthouse Performance score 95+
- [ ] Lighthouse Accessibility score 100
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Site works on mobile devices (375px+)
- [ ] Contact form stores submissions in database
- [ ] Project pages render from MDX
- [ ] All navigation links function correctly
- [ ] Dark theme consistent throughout
- [ ] Green accent color (#059669) used consistently

---

**Note:** This plan provides the first 11 tasks in detail. The remaining tasks follow the same pattern: detailed step-by-step instructions with exact file paths, code snippets, and commit messages.
