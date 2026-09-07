import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({
      router: {
        routeFileIgnorePattern: '\\.test\\.(tsx?|jsx?)$',
      },
    }),
    nitro({
      rolldownConfig: { external: [/^react(?:-dom)?(?:\/|$)/] },
      traceDeps: ['react', 'react-dom'],
    }),
    viteReact(),
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: 'stats.html',
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      onwarn(warning, defaultHandler) {
        // Suppress unused-import warnings from dependencies.
        if (
          warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
          warning.exporter?.includes('node_modules')
        )
          return
        defaultHandler(warning)
      },
    },
  },
})

export default config
