import { getValkey } from './client'
import type { RedisLike } from '@bc-solutions-coder/sdk/server'

/** Adapt the application's existing connection; the SDK owns all storage semantics. */
export function getSdkRedis(): RedisLike {
  const redis = getValkey()
  return {
    get: (key) => redis.get(key),
    set: (key, value, options) => {
      if (options?.ex !== undefined && options.nx)
        return redis.set(key, value, 'EX', options.ex, 'NX')
      if (options?.ex !== undefined)
        return redis.set(key, value, 'EX', options.ex)
      if (options?.nx) return redis.set(key, value, 'NX')
      return redis.set(key, value)
    },
    del: (key) => redis.del(key),
    sadd: (key, member) => redis.sadd(key, member),
    srem: (key, member) => redis.srem(key, member),
    smembers: (key) => redis.smembers(key),
    expire: async (key, seconds) => {
      await redis.expire(key, seconds)
    },
  }
}
