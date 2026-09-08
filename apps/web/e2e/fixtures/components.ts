import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import type { InlineConfig } from 'vite'

export { expect } from '@playwright/test'

async function serve({
  config,
  pathname = '/',
  use,
}: {
  config: InlineConfig
  pathname?: string
  use: (url: string) => Promise<void>
}) {
  const cacheDir = await mkdtemp(join(tmpdir(), 'bcordes-browser-vite-'))
  try {
    const server = await createServer({
      ...config,
      cacheDir,
      root: fileURLToPath(new URL('../..', import.meta.url)),
      server: { host: '127.0.0.1', port: 0 },
    })
    try {
      await server.listen()
      const address = server.httpServer?.address()
      if (!address || typeof address === 'string')
        throw new Error('Browser fixture port unavailable')
      await use(new URL(pathname, `http://127.0.0.1:${address.port}`).href)
    } finally {
      await server.close()
    }
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
}

export const test = base.extend<
  {},
  {
    motionURL: string
    developerURL: string
    projectFilterURL: string
    uiComponentsURL: string
  }
>({
  uiComponentsURL: [
    ({}, use) =>
      serve({
        config: { configFile: false, plugins: [react(), tailwind()] },
        pathname: '/testing/ui-components.html',
        use,
      }),
    { scope: 'worker' },
  ],
  projectFilterURL: [
    ({}, use) =>
      serve({
        config: { configFile: false, plugins: [react(), tailwind()] },
        pathname: '/testing/project-filter.html',
        use,
      }),
    { scope: 'worker' },
  ],
  motionURL: [
    ({}, use) =>
      serve({
        config: { configFile: false, plugins: [react(), tailwind()] },
        pathname: '/testing/motion.html',
        use,
      }),
    { scope: 'worker' },
  ],
  developerURL: [
    ({}, use) =>
      serve({
        config: {
          optimizeDeps: {
            include: [
              'seroval',
              '@tanstack/react-devtools',
              '@tanstack/react-router-devtools',
              '@tanstack/react-query-devtools',
            ],
          },
          configFile: fileURLToPath(
            new URL('../../vite.config.ts', import.meta.url),
          ),
        },
        use,
      }),
    { scope: 'worker' },
  ],
})
