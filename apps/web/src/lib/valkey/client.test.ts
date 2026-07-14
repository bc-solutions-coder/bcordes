// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const MockRedis = vi.fn(() => ({
  on: vi.fn().mockReturnThis(),
  connect: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('ioredis', () => ({
  default: MockRedis,
}))

describe('valkey client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  describe('getValkey', () => {
    it('returns the same instance when called twice (singleton)', async () => {
      vi.stubEnv('VALKEY_URL', 'redis://localhost:6379')
      const { getValkey } = await import('./client')
      const first = getValkey()
      const second = getValkey()
      expect(first).toBe(second)
    })

    it('throws a descriptive error when VALKEY_URL is not set', async () => {
      vi.stubEnv('VALKEY_URL', '')
      const { getValkey } = await import('./client')
      expect(() => getValkey()).toThrow('VALKEY_URL')
    })

    it('passes VALKEY_URL value to Redis constructor', async () => {
      vi.stubEnv('VALKEY_URL', 'redis://my-valkey:6380')
      const { getValkey } = await import('./client')
      getValkey()
      expect(MockRedis).toHaveBeenCalledWith(
        'redis://my-valkey:6380',
        expect.objectContaining({
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        }),
      )
    })
  })

  describe('keys', () => {
    it('session(id) returns bcordes:session:<id>', async () => {
      const { keys } = await import('./keys')
      expect(keys.session('abc')).toBe('bcordes:session:abc')
    })

    it('sessionLock(id) returns bcordes:lock:session:<id>', async () => {
      const { keys } = await import('./keys')
      expect(keys.sessionLock('x')).toBe('bcordes:lock:session:x')
    })

    it('serviceToken() returns bcordes:service-token', async () => {
      const { keys } = await import('./keys')
      expect(keys.serviceToken()).toBe('bcordes:service-token')
    })

    it('serviceTokenLock() returns bcordes:lock:service-token', async () => {
      const { keys } = await import('./keys')
      expect(keys.serviceTokenLock()).toBe('bcordes:lock:service-token')
    })

    it('oidcConfig() returns bcordes:oidc-config', async () => {
      const { keys } = await import('./keys')
      expect(keys.oidcConfig()).toBe('bcordes:oidc-config')
    })
  })
})
