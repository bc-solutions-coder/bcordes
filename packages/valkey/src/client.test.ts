// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const MockRedis = vi.fn(function () {
  return {
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
  }
})

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
      vi.stubEnv('REDIS_URL', 'redis://localhost:6379')
      const { getValkey } = await import('./index')
      const first = getValkey()
      const second = getValkey()
      expect(first).toBe(second)
    })

    it('throws a descriptive error when REDIS_URL is not set', async () => {
      vi.stubEnv('REDIS_URL', '')
      const { getValkey } = await import('./index')
      expect(() => getValkey()).toThrow('REDIS_URL')
    })

    it('connects once to the configured endpoint on first use', async () => {
      vi.stubEnv('REDIS_URL', 'redis://my-valkey:6380')
      const { getValkey } = await import('./index')
      expect(MockRedis).not.toHaveBeenCalled()
      const first = getValkey()
      getValkey()
      expect(first.connect).toHaveBeenCalledTimes(1)
      expect(MockRedis).toHaveBeenCalledTimes(1)
      expect(MockRedis).toHaveBeenCalledWith(
        'redis://my-valkey:6380',
        expect.any(Object),
      )
    })
  })

  describe('keys', () => {
    it('session(id) returns bcordes:session:<id>', async () => {
      const { keys } = await import('./index')
      expect(keys.session('abc')).toBe('bcordes:session:abc')
    })

    it('sessionLock(id) returns bcordes:lock:session:<id>', async () => {
      const { keys } = await import('./index')
      expect(keys.sessionLock('x')).toBe('bcordes:lock:session:x')
    })

    it('serviceToken() returns bcordes:service-token', async () => {
      const { keys } = await import('./index')
      expect(keys.serviceToken()).toBe('bcordes:service-token')
    })

    it('serviceTokenLock() returns bcordes:lock:service-token', async () => {
      const { keys } = await import('./index')
      expect(keys.serviceTokenLock()).toBe('bcordes:lock:service-token')
    })

    it('oidcConfig() returns bcordes:oidc-config', async () => {
      const { keys } = await import('./index')
      expect(keys.oidcConfig()).toBe('bcordes:oidc-config')
    })
  })
})
