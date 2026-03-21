export const meta = {
  slug: 'bcordes',
  title: 'Bcordes',
  description:
    'A professional portfolio and contact site built with TanStack Start, featuring a project gallery, contact form, and admin dashboard',
  client: 'BC Solutions, LLC',
  year: 2025,
  tags: ['React', 'TypeScript', 'TanStack Start', 'Tailwind CSS', 'Docker'],
  featured: true,
  image: '/images/projects/bcordes.svg',
}

export function Content() {
  return (
    <div className="showcase-content">
      <h2>Overview</h2>
      <p>
        A full-stack portfolio site serving as the public face of BC Solutions,
        LLC. Visitors can browse completed work, learn about services offered,
        and reach out through a validated contact form. An authenticated admin
        dashboard provides message management.
      </p>

      <h2>Architecture</h2>
      <p>
        Built on TanStack Start with Nitro as the server runtime, the site
        follows a BFF (Backend-for-Frontend) pattern. The browser never
        communicates directly with backend services — all data flows through
        type-safe server functions that handle auth, secrets, and API calls
        server-side.
      </p>

      <h3>Key Features</h3>
      <ul>
        <li>
          <strong>Content Pipeline</strong> — Projects and blog posts with
          type-safe metadata and React components for full styling control
        </li>
        <li>
          <strong>OIDC Authentication</strong> — Authorization code + PKCE flow
          against an OpenIddict provider, with sealed cookie sessions and
          transparent token refresh
        </li>
        <li>
          <strong>Contact System</strong> — React Hook Form with Zod validation,
          submitted through server functions to the Wallow backend
        </li>
        <li>
          <strong>Admin Dashboard</strong> — Protected panel for reviewing and
          managing incoming contact submissions
        </li>
      </ul>

      <h2>Technical Highlights</h2>
      <ul>
        <li>
          <strong>Server Functions</strong> — RPC-style data fetching via
          TanStack Start, keeping API tokens and secrets off the client
        </li>
        <li>
          <strong>File-Based Routing</strong> — TanStack Router with type-safe
          route params and search params
        </li>
        <li>
          <strong>SSR</strong> — Server-side rendering for fast initial loads and
          SEO
        </li>
        <li>
          <strong>Dark Mode</strong> — Theme toggling with custom design tokens
        </li>
        <li>
          <strong>CI/CD</strong> — GitHub Actions building multi-stage Alpine
          Docker images, pushed to GHCR and deployed via Portainer
        </li>
      </ul>
    </div>
  )
}
