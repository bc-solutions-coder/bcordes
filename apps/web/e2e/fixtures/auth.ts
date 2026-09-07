import { randomUUID } from 'node:crypto'
import { test as base } from '@playwright/test'
import { createMockSession } from '@bcordes/auth/testing'
import { getBff } from '@bcordes/auth/bff'

export { expect } from '@playwright/test'

export const test = base.extend<{
  authenticated: { owner: string; csrfToken: string }
}>({
  authenticated: [
    async ({ context, baseURL, request }, use) => {
      const bff = getBff()
      const sessionId = randomUUID()
      const csrfToken = randomUUID()
      const registered = await request.post(
        `${process.env.BFF_API_BASE_URL}/__sessions/${sessionId}`,
        { data: { token: `e2e-${sessionId}` } },
      )
      if (!registered.ok())
        throw new Error('Could not register browser session')
      const session = createMockSession({
        sessionId,
        accessToken: `e2e-${sessionId}`,
        csrfToken,
        user: {
          sub: 'e2e-user',
          name: 'Browser User',
          organizationId: 'e2e-org',
        },
      })
      let ref: string | undefined
      try {
        ref = await bff.store.write(session)
        await context.addCookies([
          {
            name: bff.config.cookieName,
            value: ref,
            url: baseURL,
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
          },
        ])
        await use({ owner: sessionId, csrfToken })
      } finally {
        try {
          if (ref) await bff.store.destroy(ref)
        } finally {
          const removed = await request.delete(
            `${process.env.BFF_API_BASE_URL}/__sessions/${sessionId}`,
          )
          if (!removed.ok()) throw new Error('Could not remove browser session')
        }
      }
    },
    { auto: true },
  ],
})
