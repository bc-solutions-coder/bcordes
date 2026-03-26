# Architecture Review: bcordes.dev

**Date**: 2026-03-25
**Scope**: Full codebase audit, architecture best practices, type organization, and styling patterns

---

## 1. Executive Summary

The bcordes codebase is a well-structured TanStack Start application with clear separation of concerns, strong type safety, and consistent patterns. It is already in better shape than most projects at this scale. The most impactful changes recommended are:

1. **Standardize path aliases** -- pick `@/` and eliminate `~/` usage (221 vs 51 occurrences; low effort, high consistency win)
2. **Decompose `ContactForm.tsx`** (351 lines) -- the largest component is doing too much and should be split into form logic and presentation
3. **Consolidate the dual CSS variable system** -- the current `styles.css` has both custom semantic variables (`--accent-primary`) and shadcn/ui variables (`--primary`) that refer to the same concepts but use different naming and color spaces
4. **Add an ESLint import restriction rule** to enforce module boundaries and prevent future architectural drift

None of these are urgent. The codebase works, ships, and is maintainable. These recommendations are about preventing entropy as the project grows.

---

## 2. Current State Assessment

### What is Working Well

**Directory structure**: The feature-based component organization (`components/home/`, `components/contact/`, `components/dashboard/`) is the current community consensus for React apps. It maps cleanly to the route structure and makes it obvious where to find things.

**Colocated tests**: Every component has an adjacent `.test.tsx` file. This is the right pattern -- tests stay in sync with the code they cover, and you never have to hunt for them in a parallel `__tests__/` tree.

**Type organization**: Domain types live in two well-scoped files (`src/lib/auth/types.ts` and `src/lib/wallow/types.ts`). Component-local types like `Stat` in `Hero.tsx` and `Service` in `ServicesGrid.tsx` stay where they are used. This is the ideal split -- centralize shared domain types, colocate everything else.

**Server/client boundary**: Server functions in `src/server-fns/` use Zod validation at the boundary. Client components are explicitly marked with `'use client'`. The import graph flows cleanly downward: routes -> components -> hooks -> lib.

**No circular dependencies**: The import graph is acyclic with shallow chains (max 3-4 levels). This is a sign of good architectural discipline.

**Styling consistency**: Tailwind v4 with CSS custom properties, `cn()` utility with `clsx` + `twMerge`, and CVA for shadcn/ui variants. No CSS modules, no CSS-in-JS, no inline `style` attributes. One approach, applied everywhere.

**Accessibility**: `prefers-reduced-motion` support in both CSS and components (`useReducedMotion` hook), ARIA attributes on interactive elements, semantic HTML (`role="list"`, `aria-label`).

### What Needs Attention

**Inconsistent path aliases**: `ContactForm.tsx` imports `~/server-fns/inquiries` (tilde) and `@/components/ui/button` (at-sign) in the same file. The `@/` alias is used 221 times vs `~/` 51 times. This is confusing for no reason.

**One oversized component**: `ContactForm.tsx` at 351 lines handles form schema definition, form state, user data fetching side effects, submission logic, success state, and all the JSX. It is the only component in the codebase that crosses the complexity threshold.

**Dual color variable systems**: `styles.css` defines `--accent-primary: #2a6b22` (hex) alongside `--primary: oklch(0.39 0.11 142)` (oklch) for shadcn/ui. These refer to the same green but in different color spaces and naming conventions. Custom components use `bg-accent-primary` while shadcn components use `bg-primary`. This works but doubles the cognitive load.

**Showcase content styles**: The `.showcase-content` block in `styles.css` (lines 246-357) is 111 lines of vanilla CSS targeting element selectors. This is the only place in the codebase that breaks the Tailwind-only convention, and it is doing so to style rendered markdown. It should at minimum be extracted to its own file.

---

## 3. Architecture Recommendations

### a) Project Structure & File Organization

**Current State**: Hybrid feature/layer organization. Feature components in `components/{home,about,contact,dashboard}/`, cross-cutting code in `lib/`, `hooks/`, `server-fns/`. Routes in `routes/` following TanStack Router conventions. Two barrel files: `src/content/projects/index.ts` and `src/lib/valkey/index.ts`.

**Best Practice**: The "bulletproof-react" pattern and TanStack community consensus recommend feature-based grouping with colocated assets. Barrel files are increasingly considered an anti-pattern for performance (Atlassian reported 75% faster builds after removing them) and IDE resolution, though small re-export files for tightly coupled modules are acceptable.

**Gap**: Minimal. The current structure is already well-aligned. The two barrel files are small and scoped -- no issue there. The `src/__tests__/` directory for integration tests is fine alongside colocated unit tests.

**Recommendation**: Keep the current structure. No changes needed. If the project adds more features (e.g., a full blog CMS, project management), consider grouping related `routes/`, `components/`, `server-fns/`, and `hooks/` into feature directories. But do not do this preemptively -- the current flat structure is clearer for a project of this size.

**Priority**: N/A -- no action needed

### b) Type Organization & Management

**Current State**:

- Domain types centralized in `src/lib/auth/types.ts` (46 lines) and `src/lib/wallow/types.ts` (106 lines)
- Component props defined inline (e.g., `Stat` in `Hero.tsx`, `Service` in `ServicesGrid.tsx`, `FadeInViewProps` in `FadeInView.tsx`)
- Zod schemas as the source of truth for server function input types (`z.infer<typeof contactFormSchema>`)
- JSDoc on all exported interfaces
- Generics where appropriate (`SelectFormField<TFieldValues extends FieldValues>`, `PaginatedResponse<T>`)

**Best Practice**:

- **Colocate types next to the code that uses them**. Only centralize types that are imported by 3+ files.
- **Zod schemas should be the single source of truth** for validated data. Derive TypeScript types with `z.infer<>` rather than maintaining parallel interfaces.
- **Use `interface` for public API contracts** (they are extendable and produce better error messages) and `type` for unions, intersections, and computed types.
- **Avoid `.d.ts` files in application code** -- they are for ambient declarations, not for types you import.
- **Name props types `{ComponentName}Props`** consistently.

**Gap**: Very small. The current approach is already aligned. One minor observation: `Stat` in `Hero.tsx` and `Service` in `ServicesGrid.tsx` are unnamed patterns -- they could benefit from the `{ComponentName}Props` naming convention if they were props, but since they are data shape types used locally, the current naming is fine.

**Recommendation**:

1. Continue the current pattern. Do not create a central `types/` directory.
2. If Wallow types grow beyond ~150 lines, consider splitting into `src/lib/wallow/types/inquiry.ts`, `src/lib/wallow/types/notification.ts`, etc. But not yet.
3. Consider exporting the `submitInquirySchema` from `server-fns/inquiries.ts` so the `ContactForm` can import and reuse it instead of redefining the same shape with `contactFormSchema`.

**Priority**: P2

### c) Styling Architecture

**Current State**:

- Single global `src/styles.css` (369 lines) with Tailwind v4, CSS custom properties, animations, and the `.showcase-content` block
- Two parallel variable systems: custom semantic tokens (`--accent-primary`, `--text-secondary`) mapped to Tailwind via `@theme inline`, and shadcn/ui tokens (`--primary`, `--muted`) also mapped via `@theme inline`
- `cn()` utility from `src/lib/utils.ts` for class merging
- CVA for shadcn/ui component variants
- No `@apply` in component code (only in `@layer base` reset)
- Custom animations defined as CSS keyframes with matching utility classes

**Best Practice**:

- Tailwind v4's `@theme` directive should be the single source of design tokens. Avoid duplicating values across multiple variable namespaces.
- `@apply` should be used sparingly -- it is acceptable in global styles and component variant definitions but not as a replacement for inline classes.
- Animation definitions in CSS are correct -- Tailwind's arbitrary animation values are hard to read and maintain.
- The `cn()` pattern with `clsx` + `twMerge` is the community standard.

**Gap**: The dual variable system (`--accent-primary` vs `--primary`) is the main issue. It means developers must remember two naming conventions: one for custom components and one for shadcn components. Since shadcn/ui expects the `--primary`/`--foreground` convention, the custom variables cannot fully replace them. But the reverse is possible.

**Recommendation**:

1. **Unify on the shadcn/ui variable names** (`--primary`, `--secondary`, `--accent`, `--muted`, `--destructive`) for the base palette. Add custom semantic aliases only where shadcn's vocabulary is insufficient (e.g., `--accent-decorative` for the bright green dots, `--background-secondary` for the light green tint).
2. **Extract `.showcase-content`** styles to a dedicated `src/styles/showcase.css` file and `@import` it in `styles.css`. This keeps the global file focused on tokens and resets.
3. **Leave animations where they are**. CSS keyframes in the global stylesheet is the correct approach.

Here is what a streamlined variable section could look like:

```css
:root {
  /* shadcn/ui core palette (green theme) */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.39 0.11 142); /* #2a6b22 */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.96 0.02 142); /* light green tint */
  --secondary-foreground: oklch(0.145 0 0);
  --muted: oklch(0.96 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.96 0.02 142);
  --accent-foreground: oklch(0.145 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.39 0.11 142);
  --radius: 0.625rem;

  /* Extended semantic tokens (beyond shadcn vocabulary) */
  --accent-decorative: #6bbf59; /* bright green for dots/badges */
  --accent-hover: #1e5218; /* darker green for hover states */
  --background-tint: #f0f9ec; /* light green background areas */
}
```

This eliminates the hex/oklch duality and reduces the variable count from ~45 to ~20.

**Priority**: P1 (the dual system creates ongoing confusion; tackle when touching styles)

### d) Component Architecture

**Current State**:

- Stateless presentational components: `Hero`, `ServicesGrid`, `SkillsShowcase`, `FeaturedWork`
- Smart components with state: `ContactForm` (form + fetch + submit), `Header` (scroll detection), `NotificationBell` (real-time)
- Shared primitives: `FadeInView` (animation wrapper), `MarkdownContent` (markdown renderer)
- shadcn/ui as the base component library (24 components in `components/ui/`)

**Best Practice**: The container/presentational split is no longer a rigid pattern, but the principle behind it still holds: separate data-fetching and side effects from rendering. Components over ~200 lines usually benefit from decomposition.

**Gap**: `ContactForm.tsx` (351 lines) is the only component that exceeds reasonable complexity. It mixes:

- Schema/constant definitions (project types, budget ranges, timelines)
- Form state management (react-hook-form)
- Side effects (user data population via `useEffect`)
- Submission logic (server function call, toast notifications)
- Two completely different render trees (form vs. success state)

**Recommendation**: Split `ContactForm.tsx` into:

```
components/contact/
  ContactForm.tsx          -- orchestrator: form state, submit handler, conditional render
  ContactFormFields.tsx    -- pure JSX: form fields and layout
  ContactFormSuccess.tsx   -- pure JSX: success state
  contact-form.schema.ts  -- Zod schema + derived type + option constants
  SelectFormField.tsx      -- (keep as-is)
```

The orchestrator shrinks to ~80 lines (useForm, useUser, handleSubmit, conditional render). Each piece becomes independently testable.

For `MarkdownContent.tsx` (191 lines): this is a utility that converts markdown strings to React nodes. Its size is justified by the parsing logic. Consider replacing the hand-rolled parser with a lightweight markdown library like `marked` paired with a sanitization library like `DOMPurify` for defense in depth. This would remove the custom regex-based HTML generation and provide proper XSS protection if the content sources ever expand beyond trusted local MDX files. At minimum, rename the processing functions to indicate they handle trusted content only (they already have a comment, but a function name like `parseLocalMarkdown` would be even clearer).

**Priority**: P1 for ContactForm split; P2 for MarkdownContent improvements

### e) Import Patterns & Module Boundaries

**Current State**:

- `@/*` (221 uses) and `~/*` (51 uses) both resolve to `./src/*`
- `@/` is used in: server-fns, lib, test utilities, shadcn/ui components
- `~/` is used in: feature components (home, contact, about), some routes, some hooks
- Some files use both (e.g., `ContactForm.tsx`, `service-client.ts`)
- No ESLint rules enforce module boundaries
- Import graph flows correctly: routes -> components -> hooks -> lib -> types

**Best Practice**: One alias, one convention. The `@/` prefix is the dominant convention in the React/Vite ecosystem (shadcn/ui defaults to it, most tutorials use it). ESLint's `no-restricted-imports` rule can enforce architectural boundaries (e.g., preventing `components/` from importing from `routes/`).

**Gap**: The dual alias is the primary issue. Additionally, there are no automated guardrails preventing a component from importing a route or a hook from importing a component.

**Recommendation**:

1. **Standardize on `@/`**. Run a find-and-replace to convert all `~/` imports to `@/`. Remove the `~/` alias from `tsconfig.json` and `vite.config.ts`. This is a safe mechanical change.
2. **Add ESLint import boundary rules**. Example configuration:

```js
// eslint.config.js (flat config)
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@/routes/*'],
          message: 'Components and hooks should not import from routes. Move shared logic to lib/ or hooks/.',
        },
        {
          group: ['@/components/*'],
          importNames: [],
          message: 'Hooks should not import components. Extract shared logic to a separate utility.',
          // Apply only to files in hooks/
        },
      ],
    }],
  },
}
```

3. **Keep relative imports for siblings**. Within a feature directory (e.g., `components/contact/`), use `./SelectFormField` rather than `@/components/contact/SelectFormField`. This makes the colocation explicit and the move-refactor easier.

**Priority**: P0 for alias standardization (mechanical, no risk); P1 for ESLint rules

---

## 4. Proposed Directory Structure

The current structure is solid. The proposed changes are minimal and focused on the gaps identified above:

```
src/
├── __tests__/                      # Integration tests (keep as-is)
├── components/
│   ├── ui/                         # shadcn/ui primitives (keep as-is)
│   ├── home/                       # Homepage components (keep as-is)
│   │   ├── Hero.tsx
│   │   ├── Hero.test.tsx
│   │   ├── ServicesGrid.tsx
│   │   ├── ServicesGrid.test.tsx
│   │   ├── SkillsShowcase.tsx
│   │   ├── SkillsShowcase.test.tsx
│   │   └── FeaturedWork.tsx
│   ├── about/                      # About page (keep as-is)
│   ├── contact/
│   │   ├── ContactForm.tsx         # CHANGED: orchestrator only (~80 lines)
│   │   ├── ContactFormFields.tsx   # NEW: extracted form field JSX
│   │   ├── ContactFormSuccess.tsx  # NEW: extracted success state
│   │   ├── contact-form.schema.ts  # NEW: extracted schema + constants
│   │   ├── SelectFormField.tsx     # (keep as-is)
│   │   └── *.test.tsx              # Colocated tests
│   ├── dashboard/                  # Dashboard components (keep as-is)
│   ├── layout/                     # Layout shell (keep as-is)
│   ├── projects/                   # Project showcase (keep as-is)
│   └── shared/                     # Cross-feature components (keep as-is)
│       ├── FadeInView.tsx
│       ├── MarkdownContent.tsx
│       └── AnimatedText.tsx
├── config/                         # Configuration constants (keep as-is)
├── content/                        # Static content (keep as-is)
├── hooks/                          # Custom hooks (keep as-is)
├── integrations/
│   └── tanstack-query/             # SSR query integration (keep as-is)
├── lib/
│   ├── auth/                       # OIDC auth (keep as-is)
│   ├── wallow/                     # Backend client (keep as-is)
│   ├── notifications/              # Notification utils (keep as-is)
│   ├── valkey/                     # Redis client (keep as-is)
│   ├── blog.ts
│   ├── format.ts
│   └── utils.ts
├── routes/                         # File-based routes (keep as-is)
├── server/                         # Server middleware (keep as-is)
├── server-fns/                     # Server functions (keep as-is)
├── styles/
│   ├── global.css                  # RENAMED from styles.css: tokens + resets + animations
│   └── showcase.css                # EXTRACTED: .showcase-content block
├── test/                           # Test utilities (keep as-is)
├── router.tsx
└── routeTree.gen.ts                # Auto-generated (never edit)
```

The total number of new files is 4 (3 from ContactForm decomposition + 1 from CSS extraction). The rest is unchanged.

---

## 5. Migration Path

### Phase 1: Mechanical Cleanup (1 hour, zero risk)

1. **Standardize imports to `@/`**: Find-and-replace all `'~/'` to `'@/'` in `.ts` and `.tsx` files. Remove the `~/` alias from `tsconfig.json` and `vite.config.ts`. Run `pnpm lint` and `pnpm test` to verify.
2. **Extract `.showcase-content`** from `styles.css` to `src/styles/showcase.css`. Add `@import './styles/showcase.css'` to the main stylesheet (or keep it in `styles.css` with a clear section comment if the extra file feels like overkill).

### Phase 2: Component Decomposition (2-3 hours, low risk)

3. **Split `ContactForm.tsx`** into `ContactFormFields.tsx`, `ContactFormSuccess.tsx`, and `contact-form.schema.ts`. Update tests. Verify form behavior in browser.

### Phase 3: Tooling Guardrails (1 hour, no risk)

4. **Add ESLint `no-restricted-imports` rule** to prevent components from importing routes and hooks from importing components.
5. **Update CLAUDE.md** to document the alias convention (`@/` only) and module boundary rules.

### Phase 4: Styling Consolidation (2-3 hours, medium effort)

6. **Unify CSS variables** by migrating custom semantic variables to the shadcn/ui naming convention. This touches `styles.css` and every component that uses `bg-accent-primary`, `text-text-secondary`, etc. Do it in one commit with a global find-and-replace, then verify visually.

---

## 6. Quick Wins

These can be done right now with minimal risk:

1. **Alias standardization** (`~/` to `@/`): 51 imports to change, all mechanical. One commit.

2. **Document the convention in CLAUDE.md**: Add a line specifying `@/` as the only alias and that `~/` should not be used.

3. **Add a `// @ts-expect-error` or explicit type to `events` in `useEventStreamEvents.ts`**: The `useEffect` dependency array omits `events` (line 15), which is correct to avoid infinite re-renders but will cause an ESLint exhaustive-deps warning. Adding an ESLint disable comment with an explanation would make the intent clear.

4. **Move the `Stat` type in `Hero.tsx`** to be named `HeroStat` if it is ever exported. Currently it is local and fine, but the generic name `Stat` could collide if the file grows.

---

## 7. Anti-patterns Found

### 7.1 Mixed Path Aliases in the Same File

**Where**: `src/components/contact/ContactForm.tsx`, `src/lib/wallow/service-client.ts`

**Example** (`ContactForm.tsx`):

```typescript
import { submitInquiry } from '~/server-fns/inquiries' // tilde
import { useUser } from '~/hooks/useUser' // tilde
import { Button } from '@/components/ui/button' // at-sign
```

**Why it is problematic**: Two aliases that resolve to the same path creates confusion about which to use. New contributors (or AI coding assistants) cannot infer the convention because there is no consistent pattern. It also makes `grep` searches less reliable -- searching for `@/components/ui/button` will miss `~/components/ui/button` imports.

**Fix**: Standardize on `@/`. Remove `~/` alias from config.

### 7.2 God Component (`ContactForm.tsx`)

**Where**: `src/components/contact/ContactForm.tsx` (351 lines)

**What it does**: Defines Zod schema, manages form state, handles user data fetching, performs submission, renders form fields, renders success state.

**Why it is problematic**: It is hard to test individual concerns in isolation. The success state cannot be rendered in Storybook without mocking the entire form. Schema changes require re-reading 350 lines to understand the impact.

**Fix**: See recommendation in Section 3d.

### 7.3 Dual CSS Variable Systems

**Where**: `src/styles.css` lines 39-102

**What happens**: The same green accent color exists as both `--accent-primary: #2a6b22` (hex) and `--primary: oklch(0.39 0.11 142)` (oklch). Components use `bg-accent-primary` while shadcn components use `bg-primary`. Both refer to the same visual color.

**Why it is problematic**: A designer changing the brand green must update it in two places using two different color space formats. A developer must remember which variable to use depending on whether they are in a custom or shadcn component. This is a maintenance trap that will eventually cause visual inconsistencies.

**Fix**: See recommendation in Section 3c.

### 7.4 Inline HTML Generation in MarkdownContent

**Where**: `src/components/shared/MarkdownContent.tsx`

**What happens**: The `processInlineMarkdown` function converts markdown syntax to HTML strings using regex replacements, which are then rendered as raw HTML. Although the comment correctly notes this only processes trusted local MDX content, the approach bypasses React's built-in protections against injection.

**Why it is problematic**: If the component is ever reused for user-generated content (e.g., blog comments), it becomes a vector for injection attacks. The function also does not sanitize HTML entities in the input text.

**Fix**: This is acceptable for the current use case but should be guarded:

- Rename the component to `LocalMarkdownContent` or add `@internal` to its JSDoc
- Consider using a lightweight markdown library like `marked` paired with `DOMPurify` for defense in depth, which would remove the custom regex-based HTML generation
- At minimum, add a runtime assertion that the content does not contain script tags or event handler attributes

### 7.5 Body-level `@apply` Override

**Where**: `src/styles.css` lines 164-173

```css
@layer base {
  body {
    @apply bg-background text-foreground;
    background-color: var(--background-primary);
    color: var(--text-primary);
  }
}
```

**What happens**: The `@apply` sets `bg-background` and `text-foreground` (shadcn variables), then raw CSS immediately overrides both with `--background-primary` and `--text-primary` (custom variables). The Tailwind classes have no effect.

**Why it is problematic**: Dead code that makes it look like two systems are cooperating when one is simply overriding the other. This will confuse anyone trying to understand which variable system is in effect.

**Fix**: Remove the `@apply` line and keep the raw CSS, or unify the variables so the `@apply` is sufficient by itself.

---

## Summary Table

| Recommendation                               | Priority | Effort  | Risk   |
| -------------------------------------------- | -------- | ------- | ------ |
| Standardize `@/` alias                       | P0       | 30 min  | None   |
| Document conventions in CLAUDE.md            | P0       | 10 min  | None   |
| Add ESLint import boundary rules             | P1       | 1 hr    | None   |
| Decompose `ContactForm.tsx`                  | P1       | 2-3 hrs | Low    |
| Unify CSS variable systems                   | P1       | 2-3 hrs | Medium |
| Extract `.showcase-content` to separate file | P2       | 15 min  | None   |
| Guard `MarkdownContent` against misuse       | P2       | 30 min  | None   |
| Fix body `@apply` override                   | P2       | 5 min   | None   |
