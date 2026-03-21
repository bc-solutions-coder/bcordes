export const meta = {
  slug: 'wallow',
  title: 'Wallow',
  description:
    'A multi-tenant SaaS platform built with ASP.NET Core, featuring identity management, billing, storage, and messaging modules',
  client: 'BC Solutions, LLC',
  year: 2025,
  tags: ['.NET', 'ASP.NET Core', 'PostgreSQL', 'OpenIddict', 'Docker'],
  featured: true,
  image: '/images/projects/wallow.svg',
}

export function Content() {
  return (
    <div className="showcase-content">
      <h2>Overview</h2>
      <p>
        Wallow is a modular, multi-tenant SaaS backend built on ASP.NET Core. It
        provides a shared foundation for applications that need identity,
        billing, storage, and messaging out of the box — without reinventing the
        wheel for each project.
      </p>

      <h2>Architecture</h2>
      <p>
        The platform follows a clean, modular architecture with each domain —
        billing, identity, storage, messaging, and showcases — organized as a
        self-contained module. A centralized configuration system and
        tenant-aware middleware tie everything together, making it
        straightforward to add new modules or onboard new tenants.
      </p>

      <h3>Key Modules</h3>
      <ul>
        <li>
          <strong>Identity & Auth</strong> — OpenIddict-based OAuth 2.0 / OpenID
          Connect server supporting authorization code + PKCE, client
          credentials, and refresh token flows
        </li>
        <li>
          <strong>Billing</strong> — Invoice generation, payment tracking, and
          subscription management with multi-currency support
        </li>
        <li>
          <strong>Storage</strong> — File upload and management with configurable
          storage backends
        </li>
        <li>
          <strong>Messaging</strong> — Announcements, notifications, and
          real-time communication channels
        </li>
        <li>
          <strong>Showcases</strong> — Portfolio and project showcase management
        </li>
      </ul>

      <h2>Technical Highlights</h2>
      <ul>
        <li>
          <strong>Multi-tenancy</strong> — Tenant isolation at the data layer
          with shared infrastructure, keeping costs low while maintaining strict
          separation
        </li>
        <li>
          <strong>OpenIddict Integration</strong> — Full OIDC provider with PKCE,
          token introspection, and dynamic client registration
        </li>
        <li>
          <strong>Rate Limiting</strong> — Per-tenant and per-endpoint rate
          limiting with configurable windows
        </li>
        <li>
          <strong>API Standards</strong> — REST endpoints following RFC 7807
          Problem Details for error responses, with OpenAPI documentation via
          Scalar
        </li>
        <li>
          <strong>Infrastructure</strong> — Runs as a Docker Compose stack with
          PostgreSQL and Valkey (Redis-compatible) for caching and session
          management
        </li>
      </ul>
    </div>
  )
}
