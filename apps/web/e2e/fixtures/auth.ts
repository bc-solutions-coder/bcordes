import { randomUUID } from 'node:crypto'
import { test as base } from '@playwright/test'
import { getValkey, keys } from '@bcordes/valkey'
import { createMockSession, createMockUser } from '@bcordes/auth/testing'
import { defaults, seal } from 'iron-webcrypto'

const SESSION_SECRET = process.env.SESSION_SECRET ?? ''

/**
 * Seal a session ID using iron-webcrypto, producing a value suitable
 * for the `__session` cookie. This mirrors the server-side sealing
 * logic in `packages/auth/src/session.ts`.
 */
export async function sealSessionId(sessionId: string): Promise<string> {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error(
      'SESSION_SECRET env var must be set (min 32 chars) to seal session cookies',
    )
  }
  return seal(sessionId, SESSION_SECRET, defaults)
}

export { expect } from '@playwright/test'

export const test = base.extend<{ authenticated: void }>({
  authenticated: [
    async ({ context, baseURL }, use) => {
      const sessionId = randomUUID()
      const redis = getValkey()
      const session = createMockSession({
        sessionId,
        accessToken: `e2e-${sessionId}`,
        user: createMockUser({ id: 'e2e-user', name: 'Browser User' }),
      })
      await redis.set(
        keys.session(sessionId),
        JSON.stringify(session),
        'EX',
        3600,
      )
      await context.addCookies([
        {
          name: '__session',
          value: await sealSessionId(sessionId),
          url: baseURL,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ])
      try {
        await use()
      } finally {
        await redis.del(keys.session(sessionId))
      }
    },
    { auto: true },
  ],
})
