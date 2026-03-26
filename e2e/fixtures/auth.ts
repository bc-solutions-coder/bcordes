import { seal, defaults } from 'iron-webcrypto'

const SESSION_SECRET = process.env.SESSION_SECRET ?? ''

/**
 * Seal a session ID using iron-webcrypto, producing a value suitable
 * for the `__session` cookie. This mirrors the server-side sealing
 * logic in `src/lib/auth/session.ts`.
 */
export async function sealSessionId(sessionId: string): Promise<string> {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error(
      'SESSION_SECRET env var must be set (min 32 chars) to seal session cookies',
    )
  }
  return seal(globalThis.crypto, sessionId, SESSION_SECRET, defaults)
}
