import { useEffect, useState } from 'react'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { Toaster } from '../components/ui/shadcn/sonner'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { reportWebVitals } from '@/lib/web-vitals'

function DevTools() {
  const [Panel, setPanel] = useState<React.ReactNode>(null)

  useEffect(() => {
    Promise.all([
      import('@tanstack/react-devtools'),
      import('@tanstack/react-router-devtools'),
      import('../integrations/tanstack-query/devtools'),
    ]).then(
      ([{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }, query]) => {
        setPanel(
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              query.default,
            ]}
          />,
        )
      },
    )
  }, [])

  return Panel
}

interface MyRouterContext {
  queryClient: QueryClient
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-8xl font-bold text-primary">404</h1>
      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Page Not Found
      </h2>
      <p className="mb-8 max-w-md text-foreground-secondary">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Go Home
      </Link>
    </div>
  )
}

const siteTitle = 'BC Solutions | Professional Software Engineering'
const siteDescription =
  'Bryan Cordes - Professional software engineering solutions. Full-stack development, technical consulting, and architecture expertise for startups and enterprises.'
const siteUrl = 'https://bcordes.dev'

export const Route = createRootRouteWithContext<MyRouterContext>()({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteTitle },
      { name: 'description', content: siteDescription },
      { name: 'author', content: 'Bryan Cordes' },
      { name: 'robots', content: 'index, follow' },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: siteTitle },
      { property: 'og:description', content: siteDescription },
      { property: 'og:url', content: siteUrl },
      { property: 'og:site_name', content: 'BC Solutions' },
      { property: 'og:locale', content: 'en_US' },
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: siteTitle },
      { name: 'twitter:description', content: siteDescription },
      // Theme
      { name: 'theme-color', content: '#2a6b22' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: siteUrl },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      // Google Fonts
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap',
      },
      // Performance: DNS prefetch for external links
      { rel: 'dns-prefetch', href: 'https://linkedin.com' },
      { rel: 'dns-prefetch', href: 'https://github.com' },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: 'Bryan Cordes',
          jobTitle: 'Software Engineer',
          url: siteUrl,
          sameAs: [
            'https://linkedin.com/in/bryancordes',
            'https://github.com/BC-Solutions-Coder',
          ],
          worksFor: {
            '@type': 'Organization',
            name: 'BC Solutions',
          },
        }),
      },
    ],
  }),

  shellComponent: RootDocument,
})

function LoadingOverlay() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    setFadeOut(true)
    const timer = setTimeout(() => setVisible(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: '0',
        zIndex: 9999,
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: 'none',
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html:
            '@keyframes loading-spin { to { transform: rotate(360deg); } }',
        }}
      />
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e5e5',
          borderTopColor: '#2a6b22',
          borderRadius: '50%',
          animation: 'loading-spin 0.8s linear infinite',
        }}
      />
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    reportWebVitals()
  }, [])

  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <head>
        <HeadContent />
      </head>
      <body style={{ margin: 0 }}>
        <LoadingOverlay />
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster position="bottom-right" />
        {import.meta.env.DEV && <DevTools />}
        <Scripts />
      </body>
    </html>
  )
}
