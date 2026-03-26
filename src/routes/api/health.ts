import { createFileRoute } from '@tanstack/react-router'
import { getValkey } from '~/lib/valkey'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await getValkey().ping()
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (result !== 'PONG') {
            return new Response(
              JSON.stringify({ status: 'unhealthy', valkey: 'ping failed' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } },
            )
          }
        } catch {
          return new Response(
            JSON.stringify({ status: 'unhealthy', valkey: 'unreachable' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
          )
        }

        return new Response(JSON.stringify({ status: 'healthy' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
