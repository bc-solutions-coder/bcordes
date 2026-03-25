import Redis from 'ioredis'

export type { Redis }

let instance: Redis | undefined

export function getValkey(): Redis {
  if (!instance) {
    const url = process.env.VALKEY_URL
    if (!url) {
      throw new Error('VALKEY_URL environment variable is required but not set')
    }
    instance = new Redis(url)
  }
  return instance
}
