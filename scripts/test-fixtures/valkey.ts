import { execFileSync } from 'node:child_process'

/** Each integration test file owns its server and data. */
export function startTestValkey() {
  const container = execFileSync(
    'docker',
    ['run', '--rm', '-d', '-p', '127.0.0.1::6379', 'valkey/valkey:8-alpine'],
    { encoding: 'utf8' },
  ).trim()
  const stop = () => {
    execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' })
  }
  try {
    const address = execFileSync('docker', ['port', container, '6379'], {
      encoding: 'utf8',
    }).trim()
    return { url: `redis://${address}`, stop }
  } catch (error) {
    stop()
    throw error
  }
}
