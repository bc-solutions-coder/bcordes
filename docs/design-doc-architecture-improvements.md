# Design Document: Architecture Improvements

**Author**: Architecture Review Team
**Date**: 2026-03-25
**Status**: Proposed
**Source**: [Architecture Review](./architecture-review.md)

---

## Table of Contents

1. [REC-1: Standardize Path Aliases](#rec-1-standardize-path-aliases)
2. [REC-2: Document Conventions in CLAUDE.md](#rec-2-document-conventions-in-claudemd)
3. [REC-3: Add ESLint Import Boundary Rules](#rec-3-add-eslint-import-boundary-rules)
4. [REC-4: Decompose ContactForm.tsx](#rec-4-decompose-contactformtsx)
5. [REC-5: Unify CSS Variable Systems](#rec-5-unify-css-variable-systems)
6. [REC-6: Extract Showcase Content Styles](#rec-6-extract-showcase-content-styles)
7. [REC-7: Guard MarkdownContent Against Misuse](#rec-7-guard-markdowncontent-against-misuse)
8. [REC-8: Fix Body @apply Override](#rec-8-fix-body-apply-override)

---

## REC-1: Standardize Path Aliases

**Priority**: P0 | **Effort**: 30 min | **Risk**: None

### Problem

The codebase uses two path aliases (`@/` and `~/`) that resolve to the same directory (`./src/*`). This creates confusion about which to use, makes grep-based searching unreliable, and produces inconsistencies within the same file.

**Current state**: 221 `@/` imports vs 51 `~/` imports across the codebase. Some files use both:

```typescript
// src/components/contact/ContactForm.tsx — mixes both aliases
import { submitInquiry } from '~/server-fns/inquiries' // tilde
import { useUser } from '~/hooks/useUser' // tilde
import { Button } from '@/components/ui/button' // at-sign
```

### Design

Standardize on `@/` as the sole path alias. The `@/` prefix is the dominant convention in the React/Vite ecosystem — shadcn/ui defaults to it, TanStack tutorials use it, and it already represents 81% of existing imports.

### Implementation

**Step 1**: Find-and-replace all `~/` to `@/` in `.ts` and `.tsx` files.

Target pattern in imports:

```
from '~/ → from '@/
from "~/ → from "@/
```

**Step 2**: Remove the `~/` alias from `tsconfig.json`.

```diff
  "paths": {
-   "@/*": ["./src/*"],
-   "~/*": ["./src/*"]
+   "@/*": ["./src/*"]
  }
```

**Step 3**: No changes needed to `vite.config.ts` — it uses `vite-tsconfig-paths` which reads from `tsconfig.json` automatically.

**Step 4**: Verify.

```bash
pnpm lint
pnpm test
pnpm build
```

### Sibling Import Convention

Within a feature directory, prefer relative imports for siblings:

```typescript
// Inside src/components/contact/ContactForm.tsx
import { SelectFormField } from './SelectFormField' // relative for siblings
import { Button } from '@/components/ui/button' // alias for cross-directory
```

This makes colocation explicit and simplifies move-refactors.

### Acceptance Criteria

- [ ] Zero `~/` imports remain in the codebase
- [ ] `~/` alias removed from `tsconfig.json`
- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` pass
- [ ] Grep for `from '~/` and `from "~/` returns zero results

---

## REC-2: Document Conventions in CLAUDE.md

**Priority**: P0 | **Effort**: 10 min | **Risk**: None

### Problem

The `@/` alias convention, module boundary rules, and sibling import preferences are not documented. AI coding assistants and future contributors cannot infer the correct convention from the codebase because the existing code is inconsistent (until REC-1 is applied).

### Design

Add an "Import Conventions" section to `CLAUDE.md` under the existing "Code Style" section.

### Implementation

Add the following to `CLAUDE.md`:

```markdown
## Import Conventions

- **Path alias**: Use `@/` exclusively. The `~/` alias is not configured.
- **Sibling imports**: Use relative paths (`./Foo`) within the same feature directory.
- **Module boundaries**: Components and hooks must not import from `routes/`. Hooks must not import components. Shared logic belongs in `lib/` or `hooks/`.
- **No barrel files**: Import directly from source files, not from `index.ts` re-exports (except `src/content/projects/index.ts` and `src/lib/valkey/index.ts` which are scoped module APIs).
```

### Acceptance Criteria

- [ ] CLAUDE.md contains an "Import Conventions" section
- [ ] Rules cover: alias choice, sibling imports, module boundaries, barrel files

---

## REC-3: Add ESLint Import Boundary Rules

**Priority**: P1 | **Effort**: 1 hr | **Risk**: None

### Problem

The import graph currently flows correctly (`routes → components → hooks → lib`), but there are no automated guardrails preventing architectural drift. A component importing from a route or a hook importing a component would not be caught until code review.

### Design

Use ESLint's built-in `no-restricted-imports` rule with per-directory overrides in the flat config. No additional plugins required.

### Implementation

Add the following to `eslint.config.js`:

```javascript
//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: [
      '.storybook/**',
      '.nitro/**',
      '.output/**',
      'coverage/**',
      'e2e/**',
      'public/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
  {
    files: ['src/components/ui/**'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  // --- Module boundary rules ---

  // Components must not import from routes
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/routes/*'],
              message:
                'Components must not import from routes. Move shared logic to lib/ or hooks/.',
            },
          ],
        },
      ],
    },
  },

  // Hooks must not import components
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/routes/*'],
              message: 'Hooks must not import from routes.',
            },
            {
              group: ['@/components/*'],
              message:
                'Hooks must not import components. Extract shared logic to a utility.',
            },
          ],
        },
      ],
    },
  },

  // Lib must not import from components, hooks, or routes
  {
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/routes/*', '@/components/*', '@/hooks/*'],
              message:
                'lib/ is a low-level layer. It must not import from routes, components, or hooks.',
            },
          ],
        },
      ],
    },
  },

  // Block the removed ~/ alias
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['~/*'],
              message: 'Use @/ instead of ~/. The ~/ alias has been removed.',
            },
          ],
        },
      ],
    },
  },
]
```

**Note**: The `no-restricted-imports` rule does not merge across config blocks — each `files` scope gets its own patterns. If a file matches multiple blocks, only the most specific one applies. The implementation above uses separate blocks per layer which avoids this issue.

### Verification

```bash
pnpm lint  # Should pass with no new violations
```

If any existing imports violate these rules, they indicate real architectural violations that should be fixed.

### Acceptance Criteria

- [ ] ESLint config includes module boundary rules for `components/`, `hooks/`, and `lib/`
- [ ] `~/` alias imports produce a lint error
- [ ] `pnpm lint` passes on the current codebase
- [ ] Adding a test import from `@/routes/` in a component file triggers a lint error

---

## REC-4: Decompose ContactForm.tsx

**Priority**: P1 | **Effort**: 2-3 hrs | **Risk**: Low

### Problem

`ContactForm.tsx` is 351 lines and handles 5 distinct responsibilities:

1. Zod schema + option constants (lines 23-84)
2. Form state management via react-hook-form (lines 86-103)
3. User data pre-population side effect (lines 105-112)
4. Submission logic + error handling (lines 114-145)
5. Two entirely separate render trees: form (lines 182-350) and success state (lines 148-180)

This makes it hard to test individual concerns in isolation. The success state cannot be rendered in Storybook without mocking the entire form. The Zod schema is defined separately from the nearly-identical `submitInquirySchema` in `server-fns/inquiries.ts`, creating duplication risk.

### Design

Split into 4 files following the single-responsibility principle:

```
src/components/contact/
├── ContactForm.tsx            # Orchestrator: form state, submit handler, conditional render (~60 lines)
├── ContactFormFields.tsx      # Pure JSX: all form fields and layout
├── ContactFormSuccess.tsx     # Pure JSX: success state
├── contact-form.schema.ts    # Zod schema, derived type, option constants
├── SelectFormField.tsx        # Keep as-is (already well-scoped)
├── ContactForm.test.tsx       # Keep as-is (integration test of the full form)
├── ContactFormFields.test.tsx # New: unit test for field rendering
└── ContactFormSuccess.test.tsx # New: unit test for success state
```

### Implementation

#### 4a. Extract `contact-form.schema.ts`

This file holds the Zod schema, inferred type, enum values, and select options.

```typescript
// src/components/contact/contact-form.schema.ts
import { z } from 'zod'

export const projectTypeValues = [
  'Frontend',
  'Full-Stack',
  'Consulting',
  'Other',
] as const

export const budgetValues = [
  'Under $5k',
  '$5k-$15k',
  '$15k-$50k',
  '$50k+',
] as const

export const timelineValues = [
  'Less than 1 month',
  '1-3 months',
  '3-6 months',
  '6+ months',
] as const

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  projectType: z.enum(projectTypeValues, {
    message: 'Please select a project type',
  }),
  budgetRange: z.enum(budgetValues, {
    message: 'Please select a budget range',
  }),
  timeline: z.enum(timelineValues, {
    message: 'Please select a timeline',
  }),
  message: z
    .string()
    .min(1, 'Message is required')
    .min(10, 'Message must be at least 10 characters'),
})

export type ContactFormValues = z.infer<typeof contactFormSchema>

export const projectTypeOptions = [
  { value: 'Frontend', label: 'Frontend Development' },
  { value: 'Full-Stack', label: 'Full-Stack Development' },
  { value: 'Consulting', label: 'Technical Consulting' },
  { value: 'Other', label: 'Other' },
] as const

export const budgetOptions = [
  { value: 'Under $5k', label: 'Under $5k' },
  { value: '$5k-$15k', label: '$5k - $15k' },
  { value: '$15k-$50k', label: '$15k - $50k' },
  { value: '$50k+', label: '$50k+' },
] as const

export const timelineOptions = [
  { value: 'Less than 1 month', label: 'Less than 1 month' },
  { value: '1-3 months', label: '1 - 3 months' },
  { value: '3-6 months', label: '3 - 6 months' },
  { value: '6+ months', label: '6+ months' },
] as const
```

**Future improvement**: The `submitInquirySchema` in `server-fns/inquiries.ts` validates the same shape with slightly different constraints (e.g., `max(200)` on name, `max(5000)` on message). Consider exporting and reusing the server schema on the client, or extracting shared enum values to a common location. This is not required for REC-4 but noted as a follow-up.

#### 4b. Extract `ContactFormSuccess.tsx`

```typescript
// src/components/contact/ContactFormSuccess.tsx
import { Button } from '@/components/ui/button'

interface ContactFormSuccessProps {
  onSendAnother: () => void
}

export function ContactFormSuccess({ onSendAnother }: ContactFormSuccessProps) {
  return (
    <div className="rounded-lg border border-border-default bg-background-secondary p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20">
        <svg className="h-6 w-6 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">Message Sent!</h3>
      <p className="mb-6 text-text-secondary">
        Thanks for reaching out. I&apos;ll get back to you within 24-48 hours.
      </p>
      <Button
        variant="outline"
        onClick={onSendAnother}
        className="border-border-default hover:border-accent-primary hover:text-accent-secondary"
      >
        Send Another Message
      </Button>
    </div>
  )
}
```

#### 4c. Extract `ContactFormFields.tsx`

This component receives the `form` instance and renders all fields. It is pure presentation — no hooks, no side effects.

```typescript
// src/components/contact/ContactFormFields.tsx
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SelectFormField } from './SelectFormField'
import type { ContactFormValues } from './contact-form.schema'
import {
  projectTypeOptions,
  budgetOptions,
  timelineOptions,
} from './contact-form.schema'

interface ContactFormFieldsProps {
  form: UseFormReturn<ContactFormValues>
  onSubmit: (data: ContactFormValues) => void
  isSubmitting: boolean
  disabledFields?: {
    name?: boolean
    email?: boolean
  }
}

export function ContactFormFields({
  form,
  onSubmit,
  isSubmitting,
  disabledFields,
}: ContactFormFieldsProps) {
  // Pure JSX — all form fields, select fields, and submit button
  // See full implementation in architecture review
}
```

The full JSX is a direct lift from the current `ContactForm.tsx` lines 182-350, with `disabled={!!user?.name}` replaced by `disabled={disabledFields?.name}`.

#### 4d. Refactor `ContactForm.tsx` (Orchestrator)

The orchestrator shrinks to ~60 lines:

```typescript
// src/components/contact/ContactForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { submitInquiry } from '@/server-fns/inquiries'
import { useUser } from '@/hooks/useUser'
import { contactFormSchema } from './contact-form.schema'
import type { ContactFormValues } from './contact-form.schema'
import { ContactFormFields } from './ContactFormFields'
import { ContactFormSuccess } from './ContactFormSuccess'

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { user } = useUser()

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '', email: '', phone: '', company: '',
      projectType: undefined, budgetRange: undefined,
      timeline: undefined, message: '',
    },
  })

  useEffect(() => {
    if (user?.email) form.setValue('email', user.email)
    if (user?.name) form.setValue('name', user.name)
  }, [user?.email, user?.name, form])

  async function onSubmit(data: ContactFormValues) {
    setIsSubmitting(true)
    try {
      await submitInquiry({
        data: {
          name: data.name, email: data.email,
          phone: data.phone || '', company: data.company || undefined,
          projectType: data.projectType, budgetRange: data.budgetRange,
          timeline: data.timeline, message: data.message,
        },
      })
      toast.success('Message sent successfully!', {
        description: "Thanks for reaching out. I'll get back to you soon.",
      })
      setIsSubmitted(true)
      form.reset()
    } catch (error) {
      console.error('Contact form submission error:', error)
      toast.error('Failed to send message', {
        description: 'Please try again or email me directly.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return <ContactFormSuccess onSendAnother={() => setIsSubmitted(false)} />
  }

  return (
    <ContactFormFields
      form={form}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      disabledFields={{ name: !!user?.name, email: !!user?.email }}
    />
  )
}
```

### Testing Strategy

- **`ContactForm.test.tsx`**: Keep as-is. It tests the integrated form behavior (submission, validation, success state). It implicitly tests all sub-components.
- **`ContactFormSuccess.test.tsx`**: New. Render with different props, verify the callback fires on button click.
- **`ContactFormFields.test.tsx`**: New. Render with a mock `form` instance, verify all fields render, verify disabled state.

### Acceptance Criteria

- [ ] `ContactForm.tsx` is under 80 lines
- [ ] Schema, options, and type live in `contact-form.schema.ts`
- [ ] Success state is a standalone component with a single prop (`onSendAnother`)
- [ ] Form fields component is pure presentation (no hooks, no side effects)
- [ ] Existing `ContactForm.test.tsx` passes without modification
- [ ] New unit tests added for `ContactFormSuccess` and `ContactFormFields`
- [ ] Visual parity: form looks and behaves identically in the browser

---

## REC-5: Unify CSS Variable Systems

**Priority**: P1 | **Effort**: 2-3 hrs | **Risk**: Medium (visual regression)

### Problem

`styles.css` defines two parallel variable systems:

| System          | Naming                                 | Color Space | Used By            | Example                                  |
| --------------- | -------------------------------------- | ----------- | ------------------ | ---------------------------------------- |
| Custom semantic | `--accent-primary`, `--text-secondary` | Hex         | Feature components | `bg-accent-primary`, `text-text-primary` |
| shadcn/ui       | `--primary`, `--muted-foreground`      | oklch       | shadcn primitives  | `bg-primary`, `text-muted-foreground`    |

Both `--accent-primary: #2a6b22` and `--primary: oklch(0.39 0.11 142)` represent the same green. A designer changing the brand color must update it in two places in two color spaces.

Additionally, in the `@layer base` block, the body element sets both systems and the raw CSS properties immediately override the `@apply` — making the Tailwind directive dead code.

### Design

**Unify on the shadcn/ui naming convention** as the primary palette, since shadcn components expect those variable names. Add a small set of **extended semantic tokens** for concepts shadcn does not cover.

#### Variable Mapping

| Current Custom Variable  | Maps To                          | Notes                                            |
| ------------------------ | -------------------------------- | ------------------------------------------------ |
| `--background-primary`   | `--background`                   | Already exists in shadcn set                     |
| `--background-secondary` | `--secondary`                    | Light green tint                                 |
| `--background-tertiary`  | `--muted`                        | Neutral gray                                     |
| `--text-primary`         | `--foreground`                   | Already exists                                   |
| `--text-secondary`       | _(new)_ `--foreground-secondary` | Subdued text (#4a4a4a)                           |
| `--text-tertiary`        | `--muted-foreground`             | Already exists                                   |
| `--accent-primary`       | `--primary`                      | Already exists — same green                      |
| `--accent-secondary`     | `--primary`                      | Consolidate (hover handled by `--primary-hover`) |
| `--accent-tertiary`      | _(new)_ `--primary-hover`        | Darker green for hover states                    |
| `--accent-decorative`    | _(new)_ `--decorative`           | Bright green for dots/badges                     |
| `--accent-light`         | `--secondary`                    | Same as background-secondary                     |
| `--accent-mid`           | _(new)_ `--decorative-muted`     | Muted green tint                                 |
| `--border-default`       | `--border`                       | Already exists                                   |
| `--border-accent`        | _(new)_ `--border-primary`       | Green-tinted border                              |
| `--focus-ring`           | `--ring`                         | Already exists                                   |
| `--gray-50/100/200`      | _(remove)_                       | Use `--muted` and `--border`                     |

#### Target `:root` Block

```css
:root {
  /* shadcn/ui core palette (green theme) */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.39 0.11 142); /* #2a6b22 */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.96 0.02 142); /* #f0f9ec */
  --secondary-foreground: oklch(0.145 0 0);
  --muted: oklch(0.96 0 0); /* #fafafa */
  --muted-foreground: oklch(0.556 0 0); /* #737373 */
  --accent: oklch(0.96 0.02 142);
  --accent-foreground: oklch(0.145 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --border: oklch(0.922 0 0); /* #e5e5e5 */
  --input: oklch(0.922 0 0);
  --ring: oklch(0.39 0.11 142);
  --radius: 0.625rem;

  /* Chart + sidebar variables (unchanged) ... */

  /* Extended semantic tokens (beyond shadcn vocabulary) */
  --primary-hover: #1e5218;
  --foreground-secondary: #4a4a4a;
  --decorative: #6bbf59;
  --decorative-muted: #dcefd4;
  --border-primary: rgb(61 139 55 / 0.3);
}
```

This eliminates the duplicate hex/oklch duality and reduces the custom variable count from ~18 to 5.

#### Component Class Find-and-Replace

323 occurrences across 29 files. Full mapping:

| Old Class                     | New Class                   |
| ----------------------------- | --------------------------- |
| `bg-background-primary`       | `bg-background`             |
| `bg-background-secondary`     | `bg-secondary`              |
| `bg-background-tertiary`      | `bg-muted`                  |
| `text-text-primary`           | `text-foreground`           |
| `text-text-secondary`         | `text-foreground-secondary` |
| `text-text-tertiary`          | `text-muted-foreground`     |
| `bg-accent-primary`           | `bg-primary`                |
| `text-accent-primary`         | `text-primary`              |
| `border-accent-primary`       | `border-primary`            |
| `bg-accent-primary/20`        | `bg-primary/20`             |
| `ring-accent-primary/50`      | `ring-primary/50`           |
| `hover:bg-accent-tertiary`    | `hover:bg-primary-hover`    |
| `hover:text-accent-secondary` | `hover:text-primary`        |
| `hover:border-accent-primary` | `hover:border-primary`      |
| `text-accent-secondary`       | `text-primary`              |
| `bg-accent-light`             | `bg-secondary`              |
| `bg-accent-mid`               | `bg-decorative-muted`       |
| `text-accent-decorative`      | `text-decorative`           |
| `bg-accent-decorative`        | `bg-decorative`             |
| `border-border-default`       | `border-border`             |
| `border-border-accent`        | `border-border-primary`     |
| `ring-focus-ring`             | `ring-ring`                 |
| `bg-gray-50`                  | `bg-muted`                  |

### Implementation Strategy

1. Update `:root` and `@theme inline` in `styles.css`
2. Run a global find-and-replace for each class mapping above
3. Update `.showcase-content` styles to use the new variable names
4. Fix the `@layer base` body rule (remove the dead `@apply` — covered by REC-8)
5. Visual review every page (home, about, contact, projects, blog, dashboard, resume)
6. Run `pnpm test` to catch any snapshot or class-matching test failures

### Risks & Mitigation

- **Visual regression**: The oklch color space may render slightly differently than hex in some browsers. Mitigate by doing a side-by-side comparison of key pages before and after.
- **Missed occurrences**: Some classes may be constructed dynamically (e.g., template literals). Mitigate by grepping for the raw variable names (`accent-primary`, `text-primary`, etc.) after migration.

### Acceptance Criteria

- [ ] Single `:root` variable system — no duplicate colors in different spaces
- [ ] Custom semantic `--color-*` entries removed from `@theme inline` (except extended tokens)
- [ ] Zero references to `bg-accent-primary`, `text-text-primary`, `bg-background-secondary` etc. in component code
- [ ] Visual parity on all pages confirmed
- [ ] `pnpm test` and `pnpm build` pass

---

## REC-6: Extract Showcase Content Styles

**Priority**: P2 | **Effort**: 15 min | **Risk**: None

### Problem

`styles.css` is 369 lines. Lines 246-357 (111 lines) define `.showcase-content` styles — vanilla CSS targeting element selectors for rendered markdown. This is the only place in the codebase that breaks the Tailwind-only convention. While the CSS is necessary (markdown-rendered elements cannot receive Tailwind classes), it bloats the global stylesheet and mixes concerns.

### Design

Extract the `.showcase-content` block to a dedicated file and import it.

### Implementation

**Step 1**: Create `src/styles/showcase.css` with the `.showcase-content` block (lines 246-357 of current `styles.css`).

**Step 2**: Replace the block in `styles.css` with an import:

```css
/* After animations section, before reduced motion */
@import './styles/showcase.css';
```

**Step 3**: Update the CSS variable references inside `.showcase-content` to match the unified variable names (if REC-5 has been applied):

| Old                          | New                           |
| ---------------------------- | ----------------------------- |
| `var(--text-primary)`        | `var(--foreground)`           |
| `var(--text-secondary)`      | `var(--foreground-secondary)` |
| `var(--text-tertiary)`       | `var(--muted-foreground)`     |
| `var(--accent-primary)`      | `var(--primary)`              |
| `var(--accent-tertiary)`     | `var(--primary-hover)`        |
| `var(--background-tertiary)` | `var(--muted)`                |
| `var(--border-default)`      | `var(--border)`               |

**Note**: If REC-5 has NOT been applied yet, keep the existing variable references as-is. The extraction is valuable on its own.

### Acceptance Criteria

- [ ] `src/styles/showcase.css` contains all `.showcase-content` rules
- [ ] `styles.css` imports it and contains no `.showcase-content` rules
- [ ] Markdown content renders identically (check `/projects/bcordes` and `/blog/*`)

---

## REC-7: Guard MarkdownContent Against Misuse

**Priority**: P2 | **Effort**: 30 min | **Risk**: None

### Problem

`MarkdownContent.tsx` uses raw HTML rendering with regex-generated HTML strings. The comment on line 3 correctly states it only processes trusted local MDX content. However:

1. The component name (`MarkdownContent`) does not signal that it is unsafe for user-generated content
2. No runtime guard prevents accidental misuse
3. The `processInlineMarkdown` function does not sanitize HTML entities in input text
4. If the component is ever reused for blog comments or user bios, it becomes a security concern

### Design

Two options, in order of preference:

#### Option A (Recommended): Replace with marked + DOMPurify

```bash
pnpm add marked dompurify
pnpm add -D @types/dompurify
```

Replace the 180-line hand-rolled parser with:

```typescript
// src/components/shared/MarkdownContent.tsx
import DOMPurify from 'dompurify'
import { marked } from 'marked'

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const rawHtml = marked.parse(content) as string
  const safeHtml = DOMPurify.sanitize(rawHtml)
  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
```

**Pros**: Eliminates 180 lines of custom parsing code. Proper XSS protection via DOMPurify sanitization. Handles edge cases the regex parser misses (nested lists, multi-line blockquotes, reference links).

**Cons**: Adds two dependencies (~30KB combined). The component no longer returns React nodes — it returns a single `div` with sanitized HTML, which changes the DOM structure slightly.

**Note**: `DOMPurify` requires a DOM environment. For SSR, use `isomorphic-dompurify` instead.

#### Option B (Minimal): Add Guardrails to Existing Parser

1. Add JSDoc `@internal` annotation to signal trusted-only usage
2. Add a development-only runtime assertion checking for script tags/event handlers
3. Rename `processInlineMarkdown` to `processLocalInlineMarkdown`

### Recommendation

Go with **Option A** if this component will ever render content from any source other than local MDX files. Go with **Option B** if you want the minimal change and are confident the component will only ever process local files.

### Acceptance Criteria

- [ ] Component either uses a sanitization library (Option A) or has JSDoc `@internal` annotation + runtime dev assertion (Option B)
- [ ] No functional change to rendered output for existing content
- [ ] Tests pass

---

## REC-8: Fix Body @apply Override

**Priority**: P2 | **Effort**: 5 min | **Risk**: None

### Problem

In `styles.css` lines 168-172:

```css
@layer base {
  body {
    @apply bg-background text-foreground;
    background-color: var(--background-primary);
    color: var(--text-primary);
  }
}
```

The `@apply` line sets shadcn variables, then the raw CSS lines immediately override both with custom variables. The `@apply` has no effect — it is dead code that makes it look like two systems are cooperating when one is simply overriding the other.

### Design

**If REC-5 has been applied**: The custom variables no longer exist. The body rule becomes:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**If REC-5 has NOT been applied**: Remove the dead `@apply` and keep the raw CSS:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    background-color: var(--background-primary);
    color: var(--text-primary);
  }
}
```

### Acceptance Criteria

- [ ] No dead `@apply` in body rule
- [ ] Body background and text color render correctly
- [ ] `pnpm build` passes

---

## Dependency Graph

```
REC-1 (Standardize @/)
  └── REC-2 (Document conventions) — should reference final convention
  └── REC-3 (ESLint rules) — rules reference @/ patterns

REC-4 (Decompose ContactForm) — independent

REC-5 (Unify CSS variables)
  └── REC-6 (Extract showcase CSS) — variable names should match
  └── REC-8 (Fix body @apply) — resolved as part of unification

REC-7 (Guard MarkdownContent) — independent
```

### Recommended Execution Order

| Phase | Recommendations | Rationale                                                     |
| ----- | --------------- | ------------------------------------------------------------- |
| 1     | REC-1, REC-2    | Mechanical, zero risk, unlocks REC-3                          |
| 2     | REC-3, REC-8    | Tooling + 5-min fix, zero risk                                |
| 3     | REC-4, REC-7    | Component changes, independent of each other                  |
| 4     | REC-5, REC-6    | Styling overhaul — do together in one commit, verify visually |
