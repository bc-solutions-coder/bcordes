import Redis from 'ioredis'

export type { Redis }

let instance: Redis | undefined

export function getValkey(): Redis {
  if (!instance) {
    const url = process.env.VALKEY_URL
    if (!url) {
      throw new Error('VALKEY_URL environment variable is required but not set')
    }
    instance = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null // stop retrying after 10 attempts
        return Math.min(times * 500, 5000)
      },
      lazyConnect: true,
    })
    instance.on('error', (err) => {
      console.warn('[valkey] connection error:', err.message)
    })
    instance.connect().catch(() => {
      // handled by the error event listener above
    })
  }
  return instance
}
