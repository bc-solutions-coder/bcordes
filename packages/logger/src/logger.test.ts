import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const directory = fileURLToPath(new URL('..', import.meta.url))
function emit(environment: string, level?: string) {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: environment }
  delete env.LOG_LEVEL
  if (level) env.LOG_LEVEL = level
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import logger from '@bcordes/logger'
logger.debug('debug fixture')
logger.info('info fixture')
logger.warn('warning fixture')
logger.child({ requestId: 'request-fixture' }).error('error fixture')
`,
    ],
    { cwd: directory, env, encoding: 'utf8', timeout: 10_000 },
  )
}

it('emits structured production records with child bindings at the default info level', () => {
  const result = emit('production')
  expect(result.status, result.stderr).toBe(0)
  const records: Array<unknown> = result.stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  expect(records).toEqual([
    expect.objectContaining({ level: 30, msg: 'info fixture' }),
    expect.objectContaining({ level: 40, msg: 'warning fixture' }),
    expect.objectContaining({
      level: 50,
      msg: 'error fixture',
      requestId: 'request-fixture',
    }),
  ])
})

it('filters records below the configured production severity', () => {
  const result = emit('production', 'error')
  expect(result.status, result.stderr).toBe(0)
  const records: Array<unknown> = result.stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  expect(records).toEqual([
    expect.objectContaining({
      level: 50,
      msg: 'error fixture',
      requestId: 'request-fixture',
    }),
  ])
})

it('emits readable development messages and exits cleanly', () => {
  const result = emit('development')
  expect(result.status, result.stderr).toBe(0)
  expect(result.stdout).toContain('info fixture')
  expect(result.stdout).toContain('error fixture')
  expect(result.stdout).not.toContain('debug fixture')
})
