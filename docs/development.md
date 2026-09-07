# Development

Start with [local setup](setup.md). The workspace contains one TanStack Start app in `apps/web` and shared TypeScript packages in `packages`. Vite builds the app; Nitro produces the Node server at `apps/web/.output/server/index.mjs`.

## Find the implementation

| Location                          | Responsibility                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/routes`             | File routes, loaders, route access checks, and page composition                                                         |
| `apps/web/src/features/<feature>` | Feature components, hooks, domain helpers, and server functions                                                         |
| `apps/web/src/shared/<module>`    | App-specific behavior used across features, such as auth and motion                                                     |
| `apps/web/src/app`                | Navigation configuration, page shell, global styles, and web vitals                                                     |
| `packages`                        | Shared UI, forms, auth, authorization, SDK clients, cache, query providers, navigation, logging, utilities, and tooling |

The [router](../apps/web/src/router.tsx) creates a query client per router and connects it to SSR. The [root route](../apps/web/src/routes/__root.tsx) mounts the page shell, notification stream provider, and toaster. [Start middleware](../apps/web/src/start.ts) handles request security and the BFF integration. See [authentication](authentication.md) and [Wallow](wallow.md) before changing server behavior.

## Keep imports within module boundaries

Use `@/` for imports within the app. Cross-module imports go through the module's `index.ts`, such as `@/features/inquiries` or `@/shared/auth`. Use relative paths inside a module. Export only what callers need.

Consume workspace packages through the exports in their `package.json`, such as `@bcordes/ui/components/button` or `@bcordes/auth/middleware`. Never import through `@bcordes/*/src/*`. Add a `workspace:*` dependency to the consuming package when introducing a package import.

[Workspace Oxlint rules](../.oxlintrc.json) reject deep module imports, the removed `~/` alias, and route imports from `features`, `shared`, or `app`. Routes compose these modules. The headless auth package cannot import UI. Keep React Query devtools behind the existing dynamic import of `@bcordes/query/devtools` so they stay out of the production bundle.

## Add a feature

1. Find the owning feature or create `apps/web/src/features/<name>`. Add components, hooks, helpers, and server functions as needed. Start with the [inquiries module](../apps/web/src/features/inquiries/index.ts) for a feature that calls the backend.
2. Add server operations in the feature's `server-fns` directory. Use `createServerFn`, choose `GET` for reads or `POST` for mutations, and validate incoming data with `.inputValidator(...)`. The [inquiry operations](../apps/web/src/features/inquiries/server-fns/inquiries.ts) show Zod input validation and SDK calls.
3. Enforce authentication, permissions, and resource ownership inside the handler before accessing data. A route access check only controls navigation; callers can invoke server functions directly. Use the appropriate authenticated or service client described in [Wallow](wallow.md).
4. Export the caller-facing functions and components from the feature's `index.ts`. Keep backend credentials and direct SDK calls in server handlers.
5. Add the route under `apps/web/src/routes`. Use `beforeLoad` for navigation access checks and a loader or query for data. The [inquiries page](../apps/web/src/routes/dashboard/inquiries.index.tsx) shows `serverRequireAuth`, loader data, and refresh through `router.invalidate()`. Vite generates `routeTree.gen.ts`; do not edit it by hand.
6. After a mutation, refresh the loader or invalidate the affected query keys. Follow [notifications](notifications.md) when the same data also changes through live events.
7. Add behavior tests beside the implementation and run the relevant [checks](testing.md). Use [UI guidance](ui.md) for components and forms.

## Keep guidance close to its owner

Comments should explain a constraint, surprising choice, or contract that the code cannot express clearly. Remove comments that repeat a name or statement. Put implementation walkthroughs and design background in the relevant guide and leave a short relative link where it helps. Preserve directives and necessary security rationale. Track proposed work in GitHub Issues, not documentation plans.

Use the [Oxc editor extension](https://oxc.rs/docs/guide/usage/linter/editors.html)
for Oxlint diagnostics and Oxfmt formatting. Workspace lint runs native typed
checks plus JS plugins for generic type-parameter naming, comment spacing and
import ordering. Import/package sorting stays disabled in Oxfmt. Run
`pnpm typecheck` for the standalone TypeScript 7 compiler checks.
