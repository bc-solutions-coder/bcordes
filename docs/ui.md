# UI

## Choose the owner

Put app-specific components in their feature or in `apps/web/src/app` for the shared shell. Reusable primitives belong in `@bcordes/ui`; React Hook Form adapters belong in `@bcordes/forms`. [Navigation components](../packages/navigation/src) have their own package. Follow the [module import rules](development.md#keep-imports-within-module-boundaries).

Import primitives from their declared subpaths:

```tsx
import { Button } from '@bcordes/ui/components/button'
import { Input } from '@bcordes/ui/components/input'
import { FormField, FormItem, FormLabel, FormMessage } from '@bcordes/forms'
import { cn } from '@bcordes/utils'
```

The primitives use Base UI and Tailwind. Read the existing component API before copying examples from another component library. For example, [Button](../packages/ui/src/components/button.tsx) composes through `render`; it does not expose Radix's `asChild` API. Pass a link through `render` to retain link semantics. The accepted `nativeButton` prop has no effect in this wrapper.

Both [app](../apps/web/components.json) and [UI package](../packages/ui/components.json) shadcn configs use `base-nova`, CSS variables, and Lucide icons. Check generated file locations before keeping CLI output. The app config still contains generic `components`, `lib`, and `hooks` aliases; app code belongs in the module structure described above.

## Change styles

[Theme tokens](../packages/ui/src/styles/theme.css) define colors, radii, and Tailwind theme mappings. Use semantic classes such as `bg-background`, `text-foreground`, and `border-border` when they express the intended role.

[App styles](../apps/web/src/app/styles.css) import Tailwind, animation styles, and `@bcordes/ui/styles.css`. Keep the token import before rules that use the variables. Explicit `@source` entries include utility classes in the UI and navigation packages. When a new shared package contributes Tailwind classes, include its source if app scanning does not cover it.

Global typography and reduced-motion overrides live in app styles. Project showcase styles live in [showcase.css](../apps/web/src/app/styles/showcase.css). The current root document sets a light color scheme; theme tokens alone do not provide a user-facing theme switch.

## Build a form

Use the [contact form](../apps/web/src/features/contact/components/ContactForm.tsx) as the working example. It creates a React Hook Form instance with a Zod resolver, owns submission state, calls the inquiry server function, and renders a separate success state. Its [field component](../apps/web/src/features/contact/components/ContactFormFields.tsx) composes the form UI.

Wrap fields in `Form`, then use `FormField`, `FormItem`, `FormLabel`, `FormControl`, and `FormMessage` to connect values, labels, and validation errors. `SelectFormField` handles the common labeled select case. The wrappers live in [@bcordes/forms](../packages/forms/src/index.ts), not the UI package.

Disable submission while a request is pending and show a useful failure state. Client validation improves feedback; the server function must still validate input and enforce access. See [development](development.md#add-a-feature).

## Preview and verify

Run `pnpm storybook` from the repository root to open Storybook on port 6006. Run `pnpm --filter bcordes build-storybook` for a static build, then `pnpm verify:storybook` to exercise the built package Button story in Chromium. The [Storybook config](../apps/web/.storybook/main.ts) discovers `*.stories.*` files in both app and package source and loads app styles through its preview config. [Button stories](../packages/ui/src/components/button.stories.tsx) show the current story format.

Check keyboard operation, focus, labels, disabled states, and narrow layouts when changing an interactive component. Add behavior tests beside it using the [testing guide](testing.md), and use the browser suite for changes that depend on the production app.
