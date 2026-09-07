import { execFileSync } from 'node:child_process'
import { getValkey } from '@bcordes/valkey'
import { startBackend } from './backend'

export default async function setup() {
  let container: string | undefined
  if (!process.env.E2E_VALKEY_URL) {
    container = execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '-d',
        '-p',
        `127.0.0.1:${process.env.E2E_VALKEY_PORT}:6379`,
        'valkey/valkey:8-alpine',
      ],
      { encoding: 'utf8' },
    ).trim()
  }
  const redis = getValkey()
  let backend: Awaited<ReturnType<typeof startBackend>> | undefined
  try {
    await redis.ping()
    backend = await startBackend(Number(process.env.E2E_BACKEND_PORT))
  } catch (error) {
    redis.disconnect()
    if (container) execFileSync('docker', ['rm', '-f', container])
    throw error
  }
  return async () => {
    try {
      await backend?.close()
    } finally {
      try {
        await redis.quit()
      } finally {
        if (container)
          execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' })
      }
    }
  }
}
