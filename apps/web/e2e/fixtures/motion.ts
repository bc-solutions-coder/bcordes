import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export { expect } from '@playwright/test'
export const test = base.extend<
  {},
  { motionURL: string; developerURL: string }
>({
  motionURL: [
    async ({}, use) => {
      const cacheDir = await mkdtemp(join(tmpdir(), 'bcordes-motion-'))
      try {
        const server = await createServer({
          cacheDir,
          configFile: false,
          root: fileURLToPath(new URL('../..', import.meta.url)),
          plugins: [react(), tailwind()],
          server: { host: '127.0.0.1', port: 0 },
        })
        try {
          await server.listen()
          const address = server.httpServer?.address()
          if (!address || typeof address === 'string')
            throw new Error('Motion fixture port unavailable')
          await use(`http://127.0.0.1:${address.port}/testing/motion.html`)
        } finally {
          await server.close()
        }
      } finally {
        await rm(cacheDir, { recursive: true, force: true })
      }
    },
    { scope: 'worker' },
  ],
  developerURL: [
    async ({}, use) => {
      const cacheDir = await mkdtemp(join(tmpdir(), 'bcordes-developer-'))
      try {
        const server = await createServer({
          cacheDir,
          root: fileURLToPath(new URL('../..', import.meta.url)),
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
          server: { host: '127.0.0.1', port: 0 },
        })
        try {
          await server.listen()
          const address = server.httpServer?.address()
          if (!address || typeof address === 'string')
            throw new Error('Developer fixture port unavailable')
          await use(`http://127.0.0.1:${address.port}`)
        } finally {
          await server.close()
        }
      } finally {
        await rm(cacheDir, { recursive: true, force: true })
      }
    },
    { scope: 'worker' },
  ],
})
