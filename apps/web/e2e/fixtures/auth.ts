import { randomUUID } from 'node:crypto'
import { test as base } from '@playwright/test'
import { createMockSession } from '@bcordes/auth/testing'
import { getBff } from '@bcordes/auth/bff'

export { expect } from '@playwright/test'

export const test = base.extend<{ authenticated: void }>({
  authenticated: [
    async ({ context, baseURL }, use) => {
      const bff = getBff()
      const sessionId = randomUUID()
      const session = createMockSession({
        sessionId,
        accessToken: `e2e-${sessionId}`,
        csrfToken: randomUUID(),
        user: {
          sub: 'e2e-user',
          name: 'Browser User',
          organizationId: 'e2e-org',
        },
      })
      const ref = await bff.store.write(session)
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
      try {
        await use()
      } finally {
        await bff.store.destroy(ref)
      }
    },
    { auto: true },
  ],
})
