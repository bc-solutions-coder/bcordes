import {
  ValkeySessionStore,
  createWallowBffServer,
  loadBffConfigFromEnv,
} from '@bc-solutions-coder/sdk/server'
import logger from '@bcordes/logger'
import { getSdkRedis } from '@bcordes/valkey/sdk'
import type { WallowBffServer } from '@bc-solutions-coder/sdk/server'

let instance: WallowBffServer | undefined

export function getBff(): WallowBffServer {
  if (!instance) {
    if (!process.env.REDIS_URL?.trim()) {
      throw new Error('REDIS_URL is required for persistent SDK sessions')
    }
    const config = loadBffConfigFromEnv(process.env)
    if (process.env.NODE_ENV === 'production' && !config.cookieSecure) {
      throw new Error('COOKIE_SECURE must be true in production')
    }
    instance = createWallowBffServer({
      config,
      store: new ValkeySessionStore({
        client: getSdkRedis(),
        password: config.cookiePasswords ?? config.cookiePassword,
        ttlSeconds: config.sessionTtlSeconds,
        keyPrefix: `wallow:${config.appId ?? 'bcordes'}`,
      }),
      onWarning: (message) => logger.warn(message),
    })
  }
  return instance
}
